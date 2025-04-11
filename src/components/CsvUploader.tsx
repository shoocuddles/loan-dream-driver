
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileUp, Download, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { parseISO, isValid, format } from 'date-fns';

interface CsvUploaderProps {
  onSuccess?: (rowCount: number) => void;
}

const CsvUploader = ({ onSuccess }: CsvUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
    errors?: string[];
  } | null>(null);

  const resetState = () => {
    setFile(null);
    setResult(null);
  };

  // Ensures a date string is properly formatted for Supabase
  const formatDateForSupabase = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === '') {
      return new Date().toISOString();
    }

    try {
      // Handle numeric values that might be mistakenly included (e.g., "600")
      if (!isNaN(Number(dateStr))) {
        console.log(`Converting numeric date "${dateStr}" to current date`);
        return new Date().toISOString();
      }

      // Try parsing as ISO format
      const parsedDate = parseISO(dateStr);
      
      if (isValid(parsedDate)) {
        return parsedDate.toISOString();
      } else {
        // If not valid ISO format, attempt other common formats
        // For simplicity, fall back to current date if parsing fails
        console.log(`Unable to parse date "${dateStr}", using current date`);
        return new Date().toISOString();
      }
    } catch (error) {
      console.error(`Error formatting date "${dateStr}":`, error);
      return new Date().toISOString();
    }
  };

  const downloadTemplate = () => {
    const currentDate = new Date().toISOString();
    
    const headers = [
      'id', 'fullname', 'phonenumber', 'email', 'streetaddress', 'city', 
      'province', 'postalcode', 'vehicletype', 'requiredfeatures', 
      'unwantedcolors', 'preferredmakemodel', 'hasexistingloan', 'currentpayment', 
      'amountowed', 'currentvehicle', 'mileage', 'employmentstatus', 'monthlyincome', 
      'additionalnotes', 'status', 'iscomplete', 'created_at', 'updated_at'
    ].join(',');

    // Format the date as YYYY-MM-DD HH:MM:SS.MSSSSS+00:00 to match provided format
    const formattedDate = new Date().toISOString().replace('Z', '+00:00');
    
    const sampleRow = [
      '', // Leave id blank for Supabase to generate
      'John Smith', 
      '416-555-1234', 
      'john@example.com', 
      '123 Main St', 
      'Toronto', 
      'Ontario', 
      'M5V 2N4', 
      'SUV', 
      'Leather Seats, Backup Camera', 
      'Red, Yellow', 
      'Honda CR-V', 
      'FALSE', // Always uppercase 'FALSE' for CSV
      '$350/month', 
      '$15000', 
      '2018 Toyota Corolla', 
      '85000', 
      'Employed', 
      '$5500', 
      'Looking for family vehicle', 
      'submitted',
      'TRUE', // Always set iscomplete to TRUE
      formattedDate, // Current date for created_at in the requested format
      formattedDate  // Current date for updated_at in the requested format
    ].join(',');

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'applications_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast.error("Please select a valid CSV file");
      e.target.value = '';
    }
  };

  const parseCsvToJson = (csv: string): Array<Record<string, any>> => {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',');
      const entry: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        let value = values[index]?.trim() ?? '';
        
        // Special handling for boolean values
        if (header === 'hasexistingloan') {
          // For database storage, convert to actual boolean string
          value = value.toUpperCase() === 'TRUE' ? 'true' : 'false';
        }
        else if (header === 'iscomplete') {
          // Always set iscomplete to "true" string regardless of input
          value = 'true';
        }
        // Handle date formatting for created_at and updated_at
        else if (header === 'created_at' || header === 'updated_at') {
          value = formatDateForSupabase(value);
        }
        
        entry[header] = value;
      });
      
      if (entry.id === '') {
        delete entry.id;
      }

      // Always ensure iscomplete is set to true
      entry.iscomplete = 'true';
      
      // Ensure created_at and updated_at are properly set with values or defaults
      if (!entry.created_at || entry.created_at === '') {
        entry.created_at = new Date().toISOString();
      }
      
      if (!entry.updated_at || entry.updated_at === '') {
        entry.updated_at = new Date().toISOString();
      }
      
      // Check for valid status
      if (!entry.status || entry.status === '') {
        entry.status = 'submitted';
      }
      
      result.push(entry);
    }

    return result;
  };

  const uploadCsv = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setResult(null);

      const text = await file.text();
      const jsonData = parseCsvToJson(text);
      
      if (jsonData.length === 0) {
        throw new Error("No valid data rows found in CSV");
      }
      
      console.log("Parsed CSV data first row:", jsonData[0]);
      console.log(`Total rows to upload: ${jsonData.length}`);
      
      // Upload in batches to avoid overwhelming Supabase
      const batchSize = 20;
      const batches = [];
      
      for (let i = 0; i < jsonData.length; i += batchSize) {
        batches.push(jsonData.slice(i, i + batchSize));
      }
      
      console.log(`Uploading in ${batches.length} batches of ${batchSize} records max`);
      
      let totalUploaded = 0;
      const errors = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i+1}/${batches.length}, ${batch.length} records`);
        
        try {
          // Sanitize each record for database insertion
          const sanitizedBatch = batch.map(record => {
            // Make a copy to avoid mutating the original
            const sanitized = { ...record };
            
            // Ensure boolean fields are properly formatted
            if (sanitized.hasexistingloan !== undefined) {
              sanitized.hasexistingloan = sanitized.hasexistingloan === 'true';
            }
            if (sanitized.iscomplete !== undefined) {
              sanitized.iscomplete = true; // Always set to true boolean, not string
            }
            
            return sanitized;
          });
          
          const { data, error } = await supabase
            .from('applications')
            .insert(sanitizedBatch)
            .select();

          if (error) {
            console.error(`Error in batch ${i+1}:`, error);
            errors.push(`Batch ${i+1}: ${error.message}`);
          } else if (data) {
            totalUploaded += data.length;
            console.log(`Successfully uploaded ${data.length} records in batch ${i+1}`);
          }
        } catch (batchError: any) {
          console.error(`Exception in batch ${i+1}:`, batchError);
          errors.push(`Batch ${i+1}: ${batchError.message}`);
        }
      }
      
      if (totalUploaded > 0) {
        setResult({
          success: true,
          message: `Successfully uploaded ${totalUploaded} application(s)${errors.length > 0 ? ' with some errors' : ''}`,
          count: totalUploaded,
          errors: errors.length > 0 ? errors : undefined
        });
        
        toast.success(`Successfully uploaded ${totalUploaded} application(s)`);
        if (onSuccess) onSuccess(totalUploaded);
      } else {
        setResult({
          success: false,
          message: "Failed to upload any applications",
          errors
        });
        toast.error("Upload failed: No applications were successfully uploaded");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setResult({
        success: false,
        message: `Error processing CSV: ${err.message}`,
        errors: [err.message]
      });
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Applications via CSV</CardTitle>
        <CardDescription>
          Upload application data in CSV format to import directly into the database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input 
              id="csvFile" 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              disabled={isUploading}
            />
            <p className="text-sm text-gray-500">
              File should be in CSV format with columns matching the application table fields.
              The "iscomplete" field will automatically be set to "true" and dates will be preserved.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              type="button"
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" /> Download Template
            </Button>
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <div>
                  <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {result.message}
                    {result.errors && result.errors.length > 0 && (
                      <ul className="list-disc pl-5 mt-2">
                        {result.errors.map((err, index) => (
                          <li key={index} className="text-sm">{err}</li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={resetState}
          disabled={isUploading || (!file && !result)}
        >
          Reset
        </Button>
        <Button 
          onClick={uploadCsv} 
          disabled={!file || isUploading}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" />
              Upload Applications
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CsvUploader;
