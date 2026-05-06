export type StudentApplicationPayload = {
  fullName: string;
  email: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  priorGpa: number;
};

export type InstructorApplicationPayload = {
  fullName: string;
  email: string;
  phone?: string;
  fieldOfExpertise: string;
  credentialsSummary: string;
};

export type ApplicationSubmitResponse = {
  ok: true;
  applicationId: string;
  message: string;
};
