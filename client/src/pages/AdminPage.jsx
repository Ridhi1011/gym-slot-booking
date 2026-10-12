import { useState } from 'react';
import { addDays, gymToday } from '../lib/time.js';
import { PageHeader } from '../components/Layout.jsx';
import CreateSessionForm from '../components/admin/CreateSessionForm.jsx';
import CheckInBox from '../components/admin/CheckInBox.jsx';
import SessionRoster from '../components/admin/SessionRoster.jsx';

export default function AdminPage() {
  const [rosterDate, setRosterDate] = useState(gymToday());
  // Bumped after a check-in or a new session so the roster refetches
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <>
      <PageHeader title="Admin" subtitle="Create sessions, see who’s booked and check members in. Times are IST." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="space-y-6">
          <CheckInBox onCheckedIn={refresh} />
          <CreateSessionForm
            defaultDate={addDays(gymToday(), 1)}
            onCreated={(date) => {
              setRosterDate(date);
              refresh();
            }}
          />
        </div>
        <SessionRoster date={rosterDate} onDateChange={setRosterDate} refreshKey={refreshKey} />
      </div>
    </>
  );
}

