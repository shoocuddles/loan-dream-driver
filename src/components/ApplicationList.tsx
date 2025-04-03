
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ApplicationForm } from "@/lib/types";

type ApplicationListProps = {
  applications: any[];
  downloadedApps: string[];
  hideDownloaded: boolean;
  setHideDownloaded: (value: boolean) => void;
  processingId: string | null;
  handleDownload: (applicationId: string) => Promise<void>;
  handleMultipleDownload: (format: 'pdf' | 'csv') => Promise<void>;
  toggleApplicationSelection: (applicationId: string) => void;
  selectedApplications: string[];
};

const ApplicationList = ({
  applications,
  downloadedApps,
  hideDownloaded,
  setHideDownloaded,
  processingId,
  handleDownload,
  handleMultipleDownload,
  toggleApplicationSelection,
  selectedApplications
}: ApplicationListProps) => {
  const displayedApplications = hideDownloaded
    ? applications.filter(app => !downloadedApps.includes(app.applicationId))
    : applications;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Available Loan Applications</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="hide-downloaded"
              checked={hideDownloaded}
              onCheckedChange={setHideDownloaded}
            />
            <Label htmlFor="hide-downloaded">Hide Downloaded</Label>
          </div>
          
          {selectedApplications.length > 0 && (
            <div className="flex space-x-2">
              <Button 
                onClick={() => handleMultipleDownload('pdf')}
                size="sm"
                className="bg-ontario-blue hover:bg-ontario-blue/90"
              >
                Download {selectedApplications.length} as PDF
              </Button>
              <Button 
                onClick={() => handleMultipleDownload('csv')}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Download as CSV
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {applications.length === 0 ? (
        <p className="text-center py-8 text-gray-500">Loading applications...</p>
      ) : displayedApplications.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          {hideDownloaded 
            ? "You've downloaded all available applications. Switch toggle to show all." 
            : "No applications are currently available."
          }
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ontario-blue text-white">
                <th className="px-4 py-3 text-left">
                  <Checkbox 
                    checked={selectedApplications.length === displayedApplications.length && displayedApplications.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const allIds = displayedApplications.map(app => app.applicationId);
                        // Add all application IDs that are not already selected
                        allIds.forEach(id => {
                          if (!selectedApplications.includes(id)) {
                            toggleApplicationSelection(id);
                          }
                        });
                      } else {
                        // Remove all application IDs that are currently selected
                        displayedApplications.forEach(app => {
                          if (selectedApplications.includes(app.applicationId)) {
                            toggleApplicationSelection(app.applicationId);
                          }
                        });
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left">Submission Date</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Application ID</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedApplications.map((app) => (
                <tr key={app.applicationId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Checkbox 
                      checked={selectedApplications.includes(app.applicationId)}
                      onCheckedChange={() => toggleApplicationSelection(app.applicationId)}
                      disabled={app.isLocked && !app.lockedBy}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {new Date(app.submissionDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {app.fullName}
                    {downloadedApps.includes(app.applicationId) && (
                      <span className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded-full">Downloaded</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{app.city || "N/A"}</td>
                  <td className="px-4 py-3">{app.applicationId}</td>
                  <td className="px-4 py-3 text-center">
                    {app.isLocked && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        Locked
                      </span>
                    )}
                    {app.wasLocked && !app.isLocked && (
                      <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">
                        Discounted
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      onClick={() => handleDownload(app.applicationId)}
                      disabled={processingId === app.applicationId || (app.isLocked && app.lockedBy !== 'currentDealerId')}
                      className={`${
                        downloadedApps.includes(app.applicationId) 
                          ? "bg-green-600 hover:bg-green-700" 
                          : app.wasLocked && !app.isLocked
                            ? "bg-amber-600 hover:bg-amber-700"
                            : "bg-ontario-blue hover:bg-ontario-blue/90"
                      }`}
                      size="sm"
                    >
                      {processingId === app.applicationId 
                        ? "Processing..." 
                        : app.isLocked
                          ? "Locked"
                          : downloadedApps.includes(app.applicationId)
                            ? "Download Again (Free)"
                            : app.wasLocked && !app.isLocked
                              ? "Download PDF (Discounted)"
                              : "Download PDF ($10.99)"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-6">
        <p className="text-sm text-gray-500">
          Note: You will be charged for each new application download. Previously downloaded applications can be accessed for free.
          Applications that have been recently downloaded by other dealers will be available at a discounted rate after the lock period expires.
        </p>
      </div>
    </div>
  );
};

export default ApplicationList;
