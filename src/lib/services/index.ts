
// Export all services for easy access

// Dealer dashboard
export * from './application/applicationService';
// Explicitly re-export dealer application services with renamed imports
export { 
  fetchAvailableApplications as fetchDealerApplications,
  fetchDownloadedApplications as fetchDealerDownloads
} from './dealer/applicationsService';
export * from './settings/settingsService';
export * from './stripe/stripeService';
export * from './purchase/purchaseService';
export * from './lock/lockService';

// Add any other service exports here
