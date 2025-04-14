
import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logEmailDebug } from '@/lib/emailLogger';

const DEFAULT_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h1 style="color: #2c3e50; text-align: center;">New Vehicle Loan Application</h1>
    <p style="color: #34495e;">A new vehicle loan application has been received:</p>
    <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px;">
      <p><strong>Name:</strong> {{fullname}}</p>
      <p><strong>City:</strong> {{city}}</p>
      <p><strong>Vehicle Type:</strong> {{vehicletype}}</p>
      <p><strong>Application Date:</strong> {{application_date}}</p>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://ontario-loans.com/dealers" style="
        display: inline-block; 
        background-color: #3498db; 
        color: white; 
        padding: 12px 24px; 
        text-decoration: none; 
        border-radius: 5px; 
        font-weight: bold;
        transition: background-color 0.3s ease;
      ">View Application in Dashboard</a>
    </div>
  </div>
  <p style="text-align: center; color: #7f8c8d; margin-top: 20px;">
    You can manage email notifications in your dealer profile.
  </p>
</div>
`;

interface EmailTemplateEditorProps {
  templateType: string;
  title: string;
  description?: string;
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  templateType,
  title,
  description
}) => {
  const [htmlContent, setHtmlContent] = useState(DEFAULT_TEMPLATE);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [isSaving, setIsSaving] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplate();
  }, [templateType]);

  const loadTemplate = async () => {
    logEmailDebug(`Loading email template for ${templateType}`);
    
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', templateType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching email template:', error);
        toast.error('Failed to load email template');
        return;
      }

      if (data) {
        logEmailDebug(`Loaded template: ${data.id}`);
        setTemplateId(data.id);
        setHtmlContent(data.html_content || DEFAULT_TEMPLATE);
      } else {
        logEmailDebug(`No template found for ${templateType}, using default`);
      }
    } catch (error) {
      console.error('Error loading email template:', error);
      toast.error('Failed to load email template');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    logEmailDebug(`Saving email template for ${templateType}`);

    try {
      let result;
      
      if (templateId) {
        // Update existing template
        result = await supabase
          .from('email_templates')
          .update({
            html_content: htmlContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId);
      } else {
        // Create new template
        result = await supabase
          .from('email_templates')
          .insert({
            type: templateType,
            html_content: htmlContent
          });
          
        // If insert successful, get the new ID
        if (!result.error) {
          const { data } = await supabase
            .from('email_templates')
            .select('id')
            .eq('type', templateType)
            .single();
            
          if (data) {
            setTemplateId(data.id);
            logEmailDebug(`Created new template with ID: ${data.id}`);
          }
        }
      }

      if (result.error) throw result.error;
      
      toast.success('Email template saved successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving email template:', error);
      toast.error('Failed to save email template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    loadTemplate();
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="view-mode" className="text-sm">Preview</Label>
            <Switch 
              id="view-mode"
              checked={viewMode === 'preview'} 
              onCheckedChange={(checked) => setViewMode(checked ? 'preview' : 'code')}
            />
          </div>
        </div>
        {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
      </CardHeader>
      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'code' | 'preview')}>
          <TabsList className="mb-4">
            <TabsTrigger value="code">HTML Code</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="code" className="p-0">
            <Textarea 
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                if (!isEditing) setIsEditing(true);
              }}
              className="min-h-[400px] font-mono"
              placeholder="Enter HTML email template..."
            />
          </TabsContent>
          
          <TabsContent value="preview" className="p-0">
            <div className="border rounded-md p-4 min-h-[400px] bg-white overflow-auto">
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Available variables: {'{'}{'{'}<strong>fullname</strong>{'}'}{'}'}, {'{'}{'{'}<strong>city</strong>{'}'}{'}'}, {'{'}{'{'}<strong>vehicletype</strong>{'}'}{'}'}, {'{'}{'{'}<strong>application_date</strong>{'}'}{'}'}
            </p>
          </div>
          <div className="flex space-x-2">
            {isEditing && (
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-ontario-blue hover:bg-ontario-blue/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Template'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTemplateEditor;
