import React from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout'; // Adjust path
import AuthWrapper from '../../components/auth/AuthWrapper';
import FetchAllSourcesControl from '../../components/dashboard/controls/FetchAllSourcesControl'; // Adjust path

const ControlsPage: React.FC = () => {
  return (
    <AuthWrapper>
      <DashboardLayout pageTitle="Control Center - My Aggregator">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Control Center</h1>
          <p className="text-md md:text-lg text-gray-600">Manage and trigger aggregation tasks.</p>
        </header>

        <div className="space-y-8">
          <FetchAllSourcesControl />
          
          {/* Future components can be added here, for example:
            <CronJobSettingsControl /> 
            <DataPruningControl />
          */}
          <div className="bg-white p-6 shadow-lg rounded-lg">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Other Controls</h2>
              <p className="text-gray-600">More control components will be added here in the future (e.g., cron job status/settings, data pruning options).</p>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default ControlsPage;