
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      applications: {
        Row: {
          id: string;
          created_at?: string;
          updated_at?: string;
          fullname: string;
          phonenumber?: string;
          email?: string;
          streetaddress?: string;
          city?: string;
          province?: string;
          postalcode?: string;
          vehicletype?: string;
          requiredfeatures?: string;
          unwantedcolors?: string;
          preferredmakemodel?: string;
          hasexistingloan?: boolean;
          currentpayment?: string;
          amountowed?: string;
          currentvehicle?: string;
          mileage?: string;
          employmentstatus?: string;
          monthlyincome?: string;
          additionalnotes?: string;
          status?: string;
          iscomplete?: boolean;
          user_id?: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          fullname: string;
          phonenumber?: string;
          email?: string;
          streetaddress?: string;
          city?: string;
          province?: string;
          postalcode?: string;
          vehicletype?: string;
          requiredfeatures?: string;
          unwantedcolors?: string;
          preferredmakemodel?: string;
          hasexistingloan?: boolean;
          currentpayment?: string;
          amountowed?: string;
          currentvehicle?: string;
          mileage?: string;
          employmentstatus?: string;
          monthlyincome?: string;
          additionalnotes?: string;
          status?: string;
          iscomplete?: boolean;
          user_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          fullname?: string;
          phonenumber?: string;
          email?: string;
          streetaddress?: string;
          city?: string;
          province?: string;
          postalcode?: string;
          vehicletype?: string;
          requiredfeatures?: string;
          unwantedcolors?: string;
          preferredmakemodel?: string;
          hasexistingloan?: boolean;
          currentpayment?: string;
          amountowed?: string;
          currentvehicle?: string;
          mileage?: string;
          employmentstatus?: string;
          monthlyincome?: string;
          additionalnotes?: string;
          status?: string;
          iscomplete?: boolean;
          user_id?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name?: string;
          phone?: string;
          company_name?: string;
          role: "dealer" | "admin";
          created_at: string;
          company_id: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          phone?: string;
          company_name?: string;
          role?: "dealer" | "admin";
          created_at?: string;
          company_id: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string;
          company_name?: string;
          role?: "dealer" | "admin";
          created_at?: string;
          company_id?: string;
        };
      };
    };
    Functions: {
      [_ in string]: unknown;
    };
  };
};
