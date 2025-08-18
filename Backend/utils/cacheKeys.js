// ~/utils/cacheKeys.js

export const cacheKeys = {
  // ===================== COMPANY =====================
  companyDashboardStats: () => `company:dashboard:stats`,
  allClients: () => `company:clients:list`,
  allVendors: () => `company:vendors:list`,
  vendorSummaryForCompany: (vendorId) => `company:vendor:${vendorId}:summary`,
  allUsers: () => `company:all:users`,
  pendingUsers: () => `company:pending:users`,
  clientDetails: (clientId) => `company:client:${clientId}:details`,

  // ===================== CLIENT =====================
  vendorListForClient: (clientId) => `client:${clientId}:vendors`,
  clientDashboardStats: (clientId) => `client:${clientId}:dashboard:stats`,
  clientQuestionnaireStatus: (vendorId) =>
    `client:vendor:${vendorId}:questionnaireStatus`,
  clientVendors: (clientId) => `client:${clientId}:all-vendors`,
  vendorAnswersForClient: (vendorId) => `client:vendor:${vendorId}:answers`,

  // ===================== VENDOR =====================
  vendorQuestionnaire: (vendorId) => `vendor:${vendorId}:questionnaire`,
  vendorDashboardStats: (vendorId) => `vendor:${vendorId}:dashboard:stats`,
  vendorSummaryForVendor: (vendorId) => `vendor:summary:vendor:${vendorId}`,
  vendorSummaryForCompany: (vendorId) => `vendor:summary:company:${vendorId}`,
  vendorSummary: (vendorId, userId) => `summary:vendor:${vendorId}:user:${userId}`,


  
};
