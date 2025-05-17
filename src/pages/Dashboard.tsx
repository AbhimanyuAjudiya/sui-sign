import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Box as InBox, Filter, RefreshCw } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import Button from '../components/ui/Button';
import AgreementCard from '../components/agreements/AgreementCard';
import { Agreement, AgreementStatus } from '../types';
import { useUser } from '../context/UserContext';
import { fetchAgreementsForUser } from '../utils/suiClient';

type Filter = 'all' | 'draft' | 'pending' | 'signed';

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  const loadAgreements = useCallback(async () => {
    if (!user?.isAuthenticated || !user?.address) return;
    
    try {
      setIsLoading(true);
      console.log('Loading agreements for user:', user.address);
      const userAgreements = await fetchAgreementsForUser(user.address);
      console.log('Loaded agreements:', userAgreements.length);
      setAgreements(userAgreements);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching agreements:', error);
      setAgreements([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate('/login');
      return;
    }
    
    loadAgreements();
  }, [user, navigate, loadAgreements]);
  
  const filteredAgreements = agreements.filter(agreement => {
    if (filter === 'all') return true;
    if (filter === 'draft') return agreement.status === AgreementStatus.DRAFT;
    if (filter === 'pending') return agreement.status === AgreementStatus.PENDING;
    if (filter === 'signed') return agreement.status === AgreementStatus.SIGNED;
    return true;
  });
  
  const createdByMe = filteredAgreements.filter(a => a.creator === user?.address);
  const receivedByMe = filteredAgreements.filter(a => {
    // Exclude agreements created by me
    if (a.creator === user?.address) return false;
    // Include agreements where the user is a signer in any signature area
    if (a.signer_areas && a.signer_areas.some(area => area.signer === user?.address)) return true;
    // Optionally, include agreements where the user is set as recipient (legacy)
    if (a.recipient === user?.address) return true;
    return false;
  });

  return (
    <PageContainer
      title="My Agreements"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Filter size={16} />}
            onClick={() => {
              const filters: Filter[] = ['all', 'draft', 'pending', 'signed'];
              const currentIndex = filters.indexOf(filter);
              const nextIndex = (currentIndex + 1) % filters.length;
              setFilter(filters[nextIndex]);
            }}
          >
            {filter === 'all' ? 'All' : 
             filter === 'draft' ? 'Drafts' : 
             filter === 'pending' ? 'Pending' : 'Signed'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />}
            onClick={() => loadAgreements()}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => navigate('/upload')}
          >
            New Agreement
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {createdByMe.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <FileText className="h-5 w-5 text-primary-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Created by me</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {createdByMe.map(agreement => (
                  <AgreementCard
                    key={agreement.id}
                    agreement={agreement}
                    userAddress={user?.address || ''}
                  />
                ))}
              </div>
            </div>
          )}
          
          {receivedByMe.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <InBox className="h-5 w-5 text-secondary-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Received by me</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receivedByMe.map(agreement => (
                  <AgreementCard
                    key={agreement.id}
                    agreement={agreement}
                    userAddress={user?.address || ''}
                  />
                ))}
              </div>
            </div>
          )}
          
          {filteredAgreements.length === 0 && (
            <div className="text-center py-16 px-4">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No agreements found</h3>
              <p className="text-gray-500 mb-6">
                {filter === 'all'
                  ? "You don't have any agreements yet."
                  : `You don't have any ${filter} agreements.`}
              </p>
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => navigate('/upload')}
              >
                Create New Agreement
              </Button>
            </div>
          )}
        </div>
      )}
      
      {!isLoading && (
        <div className="mt-4 text-xs text-gray-500 text-right">
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </div>
      )}
    </PageContainer>
  );
};

export default Dashboard;