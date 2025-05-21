import React, { useEffect, useState, useCallback } from 'react';
import PageContainer from '../components/Layout/PageContainer';
import { Agreement, AgreementStatus } from '../types';
import { useUser } from '../context/UserContext';
import { fetchAgreementsForUser } from '../utils/suiClient';
import AgreementCard from '../components/agreements/AgreementCard';
import Button from '../components/ui/Button';
import { RefreshCw } from 'lucide-react';

const Drafts: React.FC = () => {
  const { user } = useUser();
  const [drafts, setDrafts] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadDrafts = useCallback(async () => {
    if (!user?.address) {
      // console.log('No user address available, cannot load drafts');
      return;
    }
    
    setIsLoading(true);
    try {
      // console.log('Fetching agreements for user:', user.address);
      const agreements = await fetchAgreementsForUser(user.address);
      // console.log('Agreements fetched:', agreements.length);
      
      // Log all agreements received to help debug
      // if (agreements.length > 0) {
      //   console.log('All agreements details:', agreements.map(a => ({
      //     id: a.id,
      //     title: a.title,
      //     creator: a.creator,
      //     status: a.status,
      //     createdAt: new Date(a.createdAt).toLocaleString()
      //   })));
      // }
      
      // Filter for draft agreements created by this user
      const userDrafts = agreements.filter(a => {
        const isDraft = a.status === AgreementStatus.DRAFT;
        const isCreator = a.creator === user.address;
        const isDefaultCreator = a.creator === 'ANY_ADDRESS'; // Assuming this is a placeholder
        
        // if (isDraft) {
        //   console.log(`Agreement ${a.id} is a DRAFT`);
        // }
        
        // if (isCreator) {
        //   console.log(`Agreement ${a.id} - user ${user.address} is the creator`);
        // }
        
        return isDraft && (isCreator || isDefaultCreator);
      });
      
      // console.log('User drafts found:', userDrafts.length);
      // if (userDrafts.length > 0) {
      //   console.log('Draft details:', userDrafts.map(d => ({
      //     id: d.id,
      //     title: d.title,
      //     creator: d.creator,
      //     createdAt: new Date(d.createdAt).toLocaleString()
      //   })));
      // }
      
      setDrafts(userDrafts);
      setLastRefresh(new Date());
    } catch (e) {
      // console.error('Error loading drafts:', e);
      // console.error('Error details:', e); // Keep this if it provides more specific info
      setDrafts([]);
      // Optionally set an error state to display to the user
      // setError("Failed to load drafts. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleRefresh = () => {
    loadDrafts();
  };

  return (
    <PageContainer 
      title="Drafted Documents"
      actions={
        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading drafts...</div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No drafted documents found.</p>
            <p className="text-sm mt-2">Last checked: {lastRefresh.toLocaleTimeString()}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {drafts.map(draft => (
                <AgreementCard key={draft.id} agreement={draft} />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4 text-right">
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default Drafts;
