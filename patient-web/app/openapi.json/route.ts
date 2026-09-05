import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

/**
 * OpenAPI 3.1.0 specification with MPP (Machine Payment Protocol) extensions (mpp.dev)
 * Covers all healthcare verticals, service sub-types, payment modalities, and lifecycle operations.
 */
const specification = {
  openapi: "3.1.0",
  info: {
    title: "Nabd Plus Healthcare API & Commerce Services",
    version: "1.2.0",
    description: "Public API discovery and payable operations specification for Nabd Plus digital healthcare, telemedicine, diagnostics, home nursing, and pharmacy services in the Kingdom of Saudi Arabia.",
    contact: {
      name: "Nabd Plus Engineering",
      url: "https://nabd.plus",
      email: "support@nabd.plus"
    },
    license: {
      name: "Proprietary - Nabd Plus Digital Health",
      url: "https://nabd.plus/terms"
    }
  },
  servers: [
    {
      url: `${origin}/api/v1`,
      description: "Production API Gateway"
    },
    {
      url: `${origin}/api`,
      description: "BFF Patient Web Application Services"
    }
  ],
  "x-service-info": {
    categories: ["healthcare", "pharmacy", "telemedicine", "diagnostics", "nursing"],
    provider: "Nabd Plus Digital Health",
    currency: "SAR",
    compliance: ["Saudi PDPL", "SFDA", "CCHI", "MOH"]
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "OAuth 2.0 Bearer access token. Required for all Patient Health Information (PHI) and private booking operations."
      }
    }
  },
  paths: {
    /* -------------------------------------------------------------
     * 1. PHARMACY & PRESCRIPTIONS
     * ------------------------------------------------------------- */
    "/public/products/search": {
      get: {
        operationId: "searchProducts",
        summary: "Search verified medications and healthcare products",
        description: "Public catalog query across licensed SFDA pharmaceuticals, OTC treatments, and medical supplies.",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Medication name, active ingredient, or medical condition." },
          { name: "locale", in: "query", schema: { type: "string", enum: ["ar", "en", "ur", "bn", "hi", "fil"], default: "ar" }, description: "Target localized language response." }
        ],
        responses: { "200": { description: "Matching products with official SFDA price ceilings" } }
      }
    },
    "/public/categories/{locale}": {
      get: {
        operationId: "getCategories",
        summary: "Browse healthcare and pharmacy category tree",
        description: "Retrieve multi-lingual hierarchical catalog categories for medications, personal care, and diagnostics.",
        parameters: [
          { name: "locale", in: "path", required: true, schema: { type: "string", enum: ["ar", "en", "ur", "bn", "hi", "fil"] }, description: "Locale code" }
        ],
        responses: { "200": { description: "Category list with item counts" } }
      }
    },
    "/cart/checkout/agent": {
      post: {
        operationId: "processAgentOrder",
        summary: "Execute verified pharmacy order hand-off",
        description: "Creates an agent-mediated pharmacy order and returns a secure payment link. Raw card data is never processed directly.",
        "x-payment-info": {
          intent: "charge",
          method: "stripe",
          amount: "variable",
          currency: "SAR",
          description: "Patient pharmacy cart checkout with SFDA official ceiling prices."
        },
        responses: {
          "200": { description: "Order confirmed with hosted checkout link" },
          "402": { description: "Payment required before order dispatch" }
        }
      }
    },
    "/prescriptions": {
      post: {
        operationId: "uploadPrescription",
        summary: "Upload electronic prescription or scan for pharmacist dispensing",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "locale", in: "query", schema: { type: "string", enum: ["ar", "en", "ur", "bn", "hi", "fil"], default: "ar" } }
        ],
        responses: {
          "200": { description: "Prescription received and queued for clinical verification" },
          "401": { description: "Authentication required to protect Patient Health Information (PHI)" }
        }
      }
    },

    /* -------------------------------------------------------------
     * 2. DOCTOR CONSULTATIONS (Video, Clinic Visit, Home Visit)
     * ------------------------------------------------------------- */
    "/doctors": {
      get: {
        operationId: "getDoctors",
        summary: "Find verified doctors and telemedicine specialists",
        description: "Search licensed physicians filtered by specialty, consultation sub-type (video, clinic, home), and language.",
        parameters: [
          { name: "specialty", in: "query", schema: { type: "string" }, description: "Specialty slug (e.g. cardiology, pediatrics, dermatology)" },
          { name: "type", in: "query", schema: { type: "string", enum: ["video", "clinic", "home"] }, description: "Consultation sub-type modality" },
          { name: "locale", in: "query", schema: { type: "string", enum: ["ar", "en", "ur", "bn", "hi", "fil"], default: "ar" } }
        ],
        responses: { "200": { description: "List of verified practitioners and clinic affiliations" } }
      }
    },
    "/consultations/doctors/{doctorId}/slots": {
      get: {
        operationId: "getDoctorSlots",
        summary: "Retrieve real-time booking slots for a practitioner",
        parameters: [
          { name: "doctorId", in: "path", required: true, schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["video", "clinic", "home"] }, description: "Consultation sub-type" }
        ],
        responses: { "200": { description: "Available date and time slots" } }
      }
    },
    "/consultations/telehealth/session": {
      post: {
        operationId: "createTelehealthSession",
        summary: "Initialize payable virtual doctor consultation",
        description: "Creates an interactive telehealth consultation session. Requires upfront payment or approved insurance pre-authorization.",
        "x-payment-info": {
          intent: "charge",
          method: "card",
          amount: "150.00",
          currency: "SAR",
          description: "Standard general practitioner consultation fee (including 15% VAT)."
        },
        responses: {
          "200": { description: "Telehealth consultation session created" },
          "402": { description: "Payment required via card or insurance authorization" }
        }
      }
    },
    "/appointments/book": {
      post: {
        operationId: "bookAppointment",
        summary: "Book doctor consultation across video, clinic, or home modalities",
        description: "Supports both Self-Pay (`CASH`) and Insurance coverage (`INSURANCE`) modalities with idempotent execution.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "idempotency-key", in: "header", required: true, schema: { type: "string" }, description: "UUID or unique string (16-128 chars)" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["doctor_id", "type", "slot_id"],
                properties: {
                  doctor_id: { type: "string", format: "uuid" },
                  type: { type: "string", enum: ["video", "clinic", "home"], description: "Consultation modality sub-type" },
                  slot_id: { type: "string" },
                  notes: { type: "string", maxLength: 2000 },
                  coverage: { type: "string", enum: ["CASH", "INSURANCE"], default: "CASH", description: "Payment modality branch" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Appointment reserved or insurance claim submitted" },
          "401": { description: "Authentication required" }
        }
      }
    },

    /* -------------------------------------------------------------
     * 3. DIAGNOSTICS (Labs & Radiology)
     * ------------------------------------------------------------- */
    "/labs/services": {
      get: {
        operationId: "getLabServices",
        summary: "List diagnostic laboratory tests and checkup packages",
        description: "Lists blood tests, pathology panels, and comprehensive health packages with home collection availability.",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "locale", in: "query", schema: { type: "string", enum: ["ar", "en", "ur", "bn", "hi", "fil"], default: "ar" } }
        ],
        responses: { "200": { description: "Diagnostic tests list with home sample collection flags" } }
      }
    },
    "/radiology/services": {
      get: {
        operationId: "getRadiologyServices",
        summary: "List medical imaging and radiology services",
        description: "MRI, CT, X-Ray, Ultrasound, and portable imaging scans across accredited diagnostic centers.",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "locale", in: "query", schema: { type: "string", enum: ["ar", "en", "ur", "bn", "hi", "fil"], default: "ar" } }
        ],
        responses: { "200": { description: "Radiology modalities and center locations" } }
      }
    },
    "/bookings/lab": {
      post: {
        operationId: "bookLabTest",
        summary: "Book diagnostic laboratory test (Home Collection or Center Visit)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["service_id", "date", "time", "coverage"],
                properties: {
                  service_id: { type: "string" },
                  date: { type: "string", format: "date" },
                  time: { type: "string", example: "09:30" },
                  home_collection: { type: "boolean", default: true, description: "True for nurse home sample collection, false for lab center walk-in" },
                  coverage: { type: "string", enum: ["CASH", "INSURANCE"] }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Lab booking scheduled" },
          "303": { description: "Redirect to secure hosted payment gateway for self-pay" }
        }
      }
    },
    "/bookings/radiology": {
      post: {
        operationId: "bookRadiologyScan",
        summary: "Book radiology imaging appointment",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["service_id", "date", "time", "coverage"],
                properties: {
                  service_id: { type: "string" },
                  date: { type: "string", format: "date" },
                  time: { type: "string", example: "14:00" },
                  coverage: { type: "string", enum: ["CASH", "INSURANCE"] }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Radiology scan appointment reserved" },
          "303": { description: "Redirect to secure hosted payment gateway" }
        }
      }
    },

    /* -------------------------------------------------------------
     * 4. HOME NURSING SERVICES
     * ------------------------------------------------------------- */
    "/home-care/services": {
      get: {
        operationId: "getNursingServices",
        summary: "List licensed home nursing and elderly care services",
        description: "Services include hourly nurse visits, post-operative care, IV therapy, wound dressing, and elderly assistance.",
        parameters: [
          { name: "locale", in: "query", schema: { type: "string", enum: ["ar", "en", "ur", "bn", "hi", "fil"], default: "ar" } }
        ],
        responses: { "200": { description: "Home nursing services list" } }
      }
    },
    "/bookings/nursing": {
      post: {
        operationId: "bookNursingService",
        summary: "Book home nursing visit or care package",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["service_id", "date", "time", "coverage"],
                properties: {
                  service_id: { type: "string" },
                  date: { type: "string", format: "date" },
                  time: { type: "string", example: "10:00" },
                  coverage: { type: "string", enum: ["CASH", "INSURANCE"] }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Nursing visit confirmed or insurance pre-auth pending" },
          "303": { description: "Redirect to secure hosted payment gateway" }
        }
      }
    },

    /* -------------------------------------------------------------
     * 5. PAYMENT MODALITIES (Self-Pay vs Insurance)
     * ------------------------------------------------------------- */
    "/appointments/{appointmentId}/payment-intent": {
      post: {
        operationId: "createAppointmentPaymentIntent",
        summary: "Generate secure hosted checkout session for appointment self-pay",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "appointmentId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": {
            description: "Secure payment intent with hosted checkoutUrl. Never accepts direct card numbers.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    transactionId: { type: "string", format: "uuid" },
                    status: { type: "string" },
                    amount: { type: "number" },
                    currency: { type: "string", default: "SAR" },
                    checkoutUrl: { type: "string", format: "uri" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/insurance/requests/{requestId}/pay-copay": {
      post: {
        operationId: "payInsuranceCopay",
        summary: "Pay approved insurance co-payment share",
        description: "Generates secure hosted checkout URL for the patient co-payment calculated by CCHI insurance approval.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "requestId", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Co-pay checkout session created" }
        }
      }
    },

    /* -------------------------------------------------------------
     * 6. APPOINTMENT LIFECYCLE (Reschedule & Cancel)
     * ------------------------------------------------------------- */
    "/appointments/{appointmentId}/cancel": {
      post: {
        operationId: "cancelAppointment",
        summary: "Cancel scheduled consultation or service booking",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "appointmentId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "idempotency-key", in: "header", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", maxLength: 500, description: "Reason for cancellation" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Appointment successfully cancelled with automated refund/wallet return" },
          "401": { description: "Unauthorized" }
        }
      }
    },
    "/appointments/{appointmentId}/reschedule": {
      patch: {
        operationId: "rescheduleAppointment",
        summary: "Reschedule existing appointment to a new date/time slot",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "appointmentId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "idempotency-key", in: "header", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  new_slot_id: { type: "string", description: "Target doctor/clinic slot identifier" },
                  scheduled_at: { type: "string", format: "date-time" },
                  reason: { type: "string", maxLength: 500 }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Appointment rescheduled successfully" },
          "401": { description: "Unauthorized" }
        }
      }
    }
  }
} as const;

export function GET() {
  return NextResponse.json(specification, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
