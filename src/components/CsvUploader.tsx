
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileUp, Download, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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

  const downloadTemplate = () => {
    const currentDate = new Date().toISOString();
    
    const headers = [
      'id', 'fullname', 'phonenumber', 'email', 'streetaddress', 'city', 
      'province', 'postalcode', 'vehicletype', 'requiredfeatures', 
      'unwantedcolors', 'preferredmakemodel', 'hasexistingloan', 'currentpayment', 
      'amountowed', 'currentvehicle', 'mileage', 'employmentstatus', 'monthlyincome', 
      'additionalnotes', 'status', 'iscomplete', 'created_at', 'updated_at'
    ].join(',');

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
      'true', // Using string 'true' for CSV consistency
      '$350/month', 
      '$15000', 
      '2018 Toyota Corolla', 
      '85000', 
      'Employed', 
      '$5500', 
      'Looking for family vehicle', 
      'submitted',
      'true', // Always set iscomplete to true
      currentDate, // Current date for created_at
      currentDate  // Current date for updated_at
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
    const currentDate = new Date().toISOString();

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',');
      const entry: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        let value = values[index]?.trim() ?? '';
        entry[header] = value;
      });
      
      if (entry.id === '') {
        delete entry.id;
      }

      // Always set iscomplete to true string
      entry.iscomplete = 'true';
      
      // Set created_at and updated_at if not provided
      if (!entry.created_at || entry.created_at === '') {
        entry.created_at = currentDate;
      }
      
      if (!entry.updated_at || entry.updated_at === '') {
        entry.updated_at = currentDate;
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
      
      console.log("Parsed CSV data:", jsonData);
      
      const { data, error } = await supabase
        .from('applications')
        .insert(jsonData)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        setResult({
          success: false,
          message: `Error uploading applications: ${error.message}`,
          errors: [error.message]
        });
        toast.error(`Upload failed: ${error.message}`);
      } else {
        console.log("Upload response:", data);
        setResult({
          success: true,
          message: `Successfully uploaded ${data.length} application(s)`,
          count: data.length
        });
        toast.success(`Successfully uploaded ${data.length} application(s)`);
        if (onSuccess) onSuccess(data.length);
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
              The "iscomplete" field will automatically be set to "true".
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
