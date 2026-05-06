export type ReviewEligibility = {
  canReview: boolean;
  gradePosted: boolean;
  alreadyReviewed: boolean;
  reason: string | null;
};

export type ReviewClassContext = {
  id: number;
  courseName: string;
  courseCode: number | null;
  semester: string;
  year: number;
  instructorName: string | null;
};

export type ReviewContextResponse = {
  class: ReviewClassContext;
  eligibility: ReviewEligibility;
};

export type SubmitReviewRequest = {
  classId: number;
  stars: number;
  text: string;
};

export type SubmitReviewResult =
  | {
      status: "PUBLISHED";
      reviewId: number;
      finalText: string;
      warningsIssued: 0;
    }
  | {
      status: "PUBLISHED_MASKED";
      reviewId: number;
      finalText: string;
      warningsIssued: 1;
      masked: true;
    }
  | {
      status: "BLOCKED";
      reviewId: null;
      finalText: null;
      warningsIssued: 2;
      message: string;
    };

