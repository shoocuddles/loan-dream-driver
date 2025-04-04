import { createClient } from '@supabase/supabase-js';
import { ApplicationForm, Dealer, ApplicationDownload, SystemSettings } from './types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Default system settings
export const DEFAULT_SETTINGS: SystemSettings = {
  standardPrice: 10.99,
  discountedPrice: 5.99,
  lockoutPeriodHours: 2
};

// Application form functions
export const submitApplication = async (formData: ApplicationForm) => {
  const applicationId = `APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const submissionDate = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('applications')
    .insert([
      { 
        ...formData, 
        applicationId, 
        submissionDate,
        isLocked: false,
        wasLocked: false
      }
    ]);
    
  if (error) throw error;
  return { applicationId, submissionDate };
};

// Dealer authentication functions
export const signUpDealer = async (email: string, password: string, name: string, company: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        company,
        isAdmin: false,
        isActive: true
      }
    }
  });
  
  if (error) throw error;
  return data;
};

export const signInDealer = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  
  // Check if dealer is active
  if (!data.user.user_metadata.isActive) {
    await supabase.auth.signOut();
    throw new Error("Your account has been suspended. Please contact the administrator.");
  }
  
  // Set admin status in localStorage
  const isAdmin = data.user.user_metadata.isAdmin || false;
  localStorage.setItem('isAdmin', isAdmin.toString());
  
  return data;
};

export const signOutDealer = async () => {
  const { error } = await supabase.auth.signOut();
  localStorage.removeItem('isAdmin');
  if (error) throw error;
};

// Application retrieval functions
export const getApplicationsList = async () => {
  let { data, error } = await supabase
    .from('applications')
    .select('applicationId, fullName, submissionDate, city, isLocked, lockExpiresAt, lockedBy, wasLocked')
    .order('submissionDate', { ascending: false });
    
  if (error) throw error;
  if (!data) data = [];
  
  // Check if any locks have expired
  const now = new Date();
  const updatedData = await Promise.all(data.map(async (app: any) => {
    if (app.isLocked && new Date(app.lockExpiresAt) < now) {
      // Update the lock status in the database
      await supabase
        .from('applications')
        .update({ 
          isLocked: false, 
          lockExpiresAt: null, 
          lockedBy: null,
          wasLocked: true 
        })
        .eq('applicationId', app.applicationId);
      
      // Update the local data
      app.isLocked = false;
      app.lockExpiresAt = null;
      app.lockedBy = null;
      app.wasLocked = true;
    }
    
    // Format names to show only first name and last initial
    const nameParts = app.fullName.split(' ');
    const firstName = nameParts[0];
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
    
    return {
      ...app,
      fullName: `${firstName} ${lastInitial}`
    };
  }));
  
  return updatedData;
};

export const getApplicationDetails = async (applicationId: string) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('applicationId', applicationId)
    .single();
    
  if (error) throw error;
  return data;
};

// Download tracking functions
export const recordDownload = async (applicationId: string, dealerId: string, paymentAmount: number, isDiscounted: boolean = false) => {
  const { data, error } = await supabase
    .from('downloads')
    .insert([
      {
        applicationId,
        dealerId,
        downloadDate: new Date().toISOString(),
        paymentAmount,
        paymentStatus: 'completed',
        isDiscounted
      }
    ]);
    
  if (error) throw error;
  return data;
};

// Application locking functions
export const lockApplication = async (applicationId: string, dealerId: string, lockHours: number = 2) => {
  const lockExpiresAt = new Date();
  lockExpiresAt.setHours(lockExpiresAt.getHours() + lockHours);
  
  const { data, error } = await supabase
    .from('applications')
    .update({
      isLocked: true,
      lockExpiresAt: lockExpiresAt.toISOString(),
      lockedBy: dealerId
    })
    .eq('applicationId', applicationId);
    
  if (error) throw error;
  return true;
};

export const unlockApplication = async (applicationId: string) => {
  const { data, error } = await supabase
    .from('applications')
    .update({
      isLocked: false,
      lockExpiresAt: null,
      lockedBy: null
    })
    .eq('applicationId', applicationId);
    
  if (error) throw error;
  return true;
};

export const checkApplicationLock = async (applicationId: string, dealerId: string) => {
  try {
    // Get application lock status
    const { data, error } = await supabase
      .from('applications')
      .select('isLocked, lockExpiresAt, lockedBy, wasLocked')
      .eq('applicationId', applicationId)
      .single();
      
    if (error) throw error;
    
    // Get system settings
    const settings = await getSystemSettings();
    
    // Check if the application has been downloaded by this dealer
    const { data: downloadData, error: downloadError } = await supabase
      .from('downloads')
      .select('*')
      .eq('applicationId', applicationId)
      .eq('dealerId', dealerId);
      
    if (downloadError) throw downloadError;
    
    const hasDownloaded = downloadData && downloadData.length > 0;
    
    // Get the lock expiration time
    const now = new Date();
    const lockExpiresAt = data.lockExpiresAt ? new Date(data.lockExpiresAt) : null;
    
    // Check if the lock is expired
    if (data.isLocked && lockExpiresAt && lockExpiresAt < now) {
      // Lock is expired, update in DB
      await unlockApplication(applicationId);
      data.isLocked = false;
      data.wasLocked = true;
    }
    
    // Determine if this is a discounted download (previously locked but now unlocked)
    const isDiscounted = data.wasLocked && !data.isLocked;
    
    return {
      isLocked: data.isLocked,
      canDownload: !data.isLocked || data.lockedBy === dealerId || hasDownloaded,
      isDiscounted,
      price: hasDownloaded ? 0 : (isDiscounted ? settings.discountedPrice : settings.standardPrice)
    };
  } catch (error) {
    console.error("Error checking application lock:", error);
    // Default to allowing download at standard price
    const settings = await getSystemSettings();
    return {
      isLocked: false,
      canDownload: true,
      isDiscounted: false,
      price: settings.standardPrice
    };
  }
};

// Admin functions
export const checkIsAdmin = async (userId: string) => {
  const { data, error } = await supabase
    .from('dealers')
    .select('isAdmin')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data?.isAdmin || false;
};

export const getAllApplications = async () => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('submissionDate', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

// System settings functions
export const getSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();
      
    if (error || !data) {
      // If there are no settings yet, create default ones
      await supabase
        .from('settings')
        .insert([DEFAULT_SETTINGS]);
      
      const { data: insertedData, error: fetchError } = await supabase
        .from('settings')
        .select('*')
        .single();
        
      if (fetchError) throw fetchError;
      return insertedData || DEFAULT_SETTINGS;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateSystemSettings = async (settings: Partial<SystemSettings>) => {
  try {
    const { error } = await supabase
      .from('settings')
      .update(settings)
      .eq('id', 1); // Assuming there's only one settings record
      
    if (error) throw error;
    
    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('*')
      .single();
      
    if (fetchError) throw fetchError;
    return data || DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Error updating system settings:", error);
    throw error;
  }
};

// Dealer management functions
export const getAllDealers = async () => {
  const { data, error } = await supabase
    .from('dealers')
    .select('*');
    
  if (error) throw error;
  return data || [];
};

export const addDealer = async (email: string, password: string, name: string, company: string) => {
  // Create authentication account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        company,
        isAdmin: false,
        isActive: true
      }
    }
  });
  
  if (authError) throw authError;
  
  // Add dealer to dealers table
  const { data, error } = await supabase
    .from('dealers')
    .insert([
      {
        id: authData.user?.id,
        email,
        name,
        company,
        isAdmin: false,
        isActive: true
      }
    ]);
    
  if (error) throw error;
  return { id: authData.user?.id };
};

export const updateDealer = async (id: string, updates: Partial<Dealer>) => {
  // Update dealer in dealers table
  const { data, error } = await supabase
    .from('dealers')
    .update(updates)
    .eq('id', id);
    
  if (error) throw error;
  
  // Update user metadata in auth
  if (updates.isAdmin !== undefined || updates.isActive !== undefined || updates.name !== undefined || updates.company !== undefined) {
    const { data: userData, error: userError } = await supabase.auth.updateUser({
      data: {
        isAdmin: updates.isAdmin,
        isActive: updates.isActive,
        name: updates.name,
        company: updates.company
      }
    });
    
    if (userError) throw userError;
  }
  
  return { id };
};

export const deleteDealer = async (id: string) => {
  // Delete dealer from dealers table
  const { error } = await supabase
    .from('dealers')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  
  // Delete user from auth (would be handled by Supabase triggers in a real application)
  // This is not directly possible with Supabase JS client, would need admin API or Edge Function
  
  return true;
};

// PDF generation function
export const generateApplicationPDF = (application: ApplicationForm, isAdmin: boolean = false) => {
  const pdf = new jsPDF();
  
  // Add header
  pdf.setFontSize(20);
  pdf.setTextColor(0, 51, 102); // Ontario blue
  pdf.text(`Ontario Loans - Application Details${isAdmin ? ' (ADMIN)' : ''}`, 105, 15, { align: "center" });
  
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Application ID: ${application.applicationId}`, 105, 25, { align: "center" });
  pdf.text(`Submission Date: ${new Date(application.submissionDate || '').toLocaleDateString()}`, 105, 30, { align: "center" });
  
  // Personal Information
  pdf.setFontSize(16);
  pdf.setTextColor(0, 51, 102);
  pdf.text("Personal Information", 14, 40);
  
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  
  const personalInfo = [
    ["Name", application.fullName],
    ["Phone", application.phoneNumber],
    ["Email", application.email],
    ["Address", `${application.streetAddress}, ${application.city}, ${application.province}, ${application.postalCode}`]
  ];
  
  // @ts-ignore
  pdf.autoTable({
    startY: 45,
    head: [["Field", "Value"]],
    body: personalInfo,
    theme: "grid",
    headStyles: { fillColor: [0, 51, 102] }
  });
  
  // Vehicle Details
  pdf.setFontSize(16);
  pdf.setTextColor(0, 51, 102);
  // @ts-ignore
  pdf.text("Desired Vehicle Details", 14, pdf.autoTable.previous.finalY + 10);
  
  const vehicleInfo = [
    ["Vehicle Type", application.vehicleType],
    ["Required Features", application.requiredFeatures],
    ["Unwanted Colors", application.unwantedColors],
    ["Preferred Make & Model", application.preferredMakeModel]
  ];
  
  // @ts-ignore
  pdf.autoTable({
    // @ts-ignore
    startY: pdf.autoTable.previous.finalY + 15,
    head: [["Field", "Value"]],
    body: vehicleInfo,
    theme: "grid",
    headStyles: { fillColor: [0, 51, 102] }
  });
  
  // Existing Loan Info
  pdf.setFontSize(16);
  pdf.setTextColor(0, 51, 102);
  // @ts-ignore
  pdf.text("Current Loan Information", 14, pdf.autoTable.previous.finalY + 10);
  
  const loanInfo = [];
  if (application.hasExistingLoan) {
    loanInfo.push(
      ["Has Existing Loan", "Yes"],
      ["Current Payment", `$${application.currentPayment}`],
      ["Amount Owed", `$${application.amountOwed}`],
      ["Current Vehicle", application.currentVehicle],
      ["Mileage", `${application.mileage} km`]
    );
  } else {
    loanInfo.push(["Has Existing Loan", "No"]);
  }
  
  // @ts-ignore
  pdf.autoTable({
    // @ts-ignore
    startY: pdf.autoTable.previous.finalY + 15,
    head: [["Field", "Value"]],
    body: loanInfo,
    theme: "grid",
    headStyles: { fillColor: [0, 51, 102] }
  });
  
  // Income Details
  pdf.setFontSize(16);
  pdf.setTextColor(0, 51, 102);
  // @ts-ignore
  pdf.text("Income Information", 14, pdf.autoTable.previous.finalY + 10);
  
  const incomeInfo = [
    ["Employment Status", application.employmentStatus],
    ["Monthly Income", `$${application.monthlyIncome}`],
    ["Additional Notes", application.additionalNotes || "None"]
  ];
  
  // @ts-ignore
  pdf.autoTable({
    // @ts-ignore
    startY: pdf.autoTable.previous.finalY + 15,
    head: [["Field", "Value"]],
    body: incomeInfo,
    theme: "grid",
    headStyles: { fillColor: [0, 51, 102] }
  });
  
  // Footer
  pdf.setFontSize(10);
  pdf.setTextColor(128, 128, 128);
  // @ts-ignore
  pdf.text(`Downloaded ${isAdmin ? 'by ADMIN' : 'by dealer'} on ${new Date().toLocaleString()}`, 105, pdf.autoTable.previous.finalY + 15, { align: "center" });
  
  return pdf;
};

// CSV generation function
export const generateApplicationsCSV = (applications: ApplicationForm[]) => {
  const headers = [
    "Application ID",
    "Submission Date",
    "Full Name",
    "Email",
    "Phone",
    "Address",
    "City",
    "Province",
    "Postal Code",
    "Vehicle Type",
    "Required Features",
    "Unwanted Colors",
    "Preferred Make & Model",
    "Has Existing Loan",
    "Current Payment",
    "Amount Owed",
    "Current Vehicle",
    "Mileage",
    "Employment Status",
    "Monthly Income",
    "Additional Notes"
  ];
  
  const rows = applications.map(app => [
    app.applicationId || '',
    app.submissionDate || '',
    app.fullName,
    app.email,
    app.phoneNumber,
    app.streetAddress,
    app.city,
    app.province,
    app.postalCode,
    app.vehicleType,
    app.requiredFeatures,
    app.unwantedColors,
    app.preferredMakeModel,
    app.hasExistingLoan ? 'Yes' : 'No',
    app.currentPayment || '',
    app.amountOwed || '',
    app.currentVehicle || '',
    app.mileage || '',
    app.employmentStatus,
    app.monthlyIncome,
    app.additionalNotes || ''
  ]);
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
};
