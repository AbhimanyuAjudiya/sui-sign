import React, { useEffect, useState } from 'react';
import PageContainer from '../components/Layout/PageContainer';
import { Agreement, AgreementStatus } from '../types';
import { useUser } from '../context/UserContext';
import { fetchAgreementsForUser } from '../utils/suiClient';
import AgreementCard from '../components/agreements/AgreementCard';

const Drafts: React.FC = () => {
  const { user } = useUser();
  const [drafts, setDrafts] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDrafts = async () => {
      if (!user?.address) return;
      setIsLoading(true);
      try {
        const agreements = await fetchAgreementsForUser(user.address);
        setDrafts(agreements.filter(a => a.status === AgreementStatus.DRAFT && a.creator === user.address));
      } catch (e) {
        setDrafts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadDrafts();
  }, [user]);

  return (
    <PageContainer title="Drafted Documents">
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading drafts...</div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No drafted documents found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drafts.map(draft => (
              <AgreementCard key={draft.id} agreement={draft} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default Drafts;
