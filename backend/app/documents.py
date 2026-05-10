"""Registry of supported legal document types.

Single source of truth for the 11 Common Paper templates listed in
catalog.json. Each entry declares display metadata, the standard-terms URL
to cite, and a small set of doc-specific cover-page fields the AI must
collect (in addition to the common cover fields shared by every doc).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class FieldSpec:
    """One doc-specific cover-page field the AI must gather."""

    name: str
    label: str
    prompt: str  # short hint for what to ask the user


@dataclass(frozen=True)
class DocumentSpec:
    slug: str
    display_name: str
    catalog_name: str  # exact match for catalog.json `name`
    terms_url: str
    terms_version: str
    extra_fields: tuple[FieldSpec, ...] = field(default_factory=tuple)


# Slugs are stable identifiers used over the wire. Display names are for UX.
MUTUAL_NDA = "mutual_nda"

DOCUMENTS: dict[str, DocumentSpec] = {
    MUTUAL_NDA: DocumentSpec(
        slug=MUTUAL_NDA,
        display_name="Mutual NDA",
        catalog_name="Mutual NDA",
        terms_url="https://commonpaper.com/standards/mutual-nda/1.0",
        terms_version="1.0",
        # NDA fields are handled by the dedicated NDA path; this entry is mostly
        # used for routing & display.
        extra_fields=(),
    ),
    "csa": DocumentSpec(
        slug="csa",
        display_name="Cloud Service Agreement",
        catalog_name="Cloud Service Agreement (CSA)",
        terms_url="https://commonpaper.com/standards/cloud-service-agreement/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "subscriptionPeriod",
                "Subscription period",
                "How long does the subscription run? (e.g. '12 months')",
            ),
            FieldSpec(
                "fees",
                "Fees",
                "What are the fees and how are they billed? (e.g. '$10,000/year, invoiced annually')",
            ),
            FieldSpec(
                "paymentProcess",
                "Payment process",
                "Net-30 invoice, automatic credit card, etc.",
            ),
            FieldSpec(
                "generalCapAmount",
                "General liability cap",
                "Cap on total cumulative liability (e.g. 'fees paid in the prior 12 months')",
            ),
        ),
    ),
    "design_partner": DocumentSpec(
        slug="design_partner",
        display_name="Design Partner Agreement",
        catalog_name="Design Partner Agreement",
        terms_url="https://commonpaper.com/standards/design-partner-agreement/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "designPartnerPeriod",
                "Design partner period",
                "How long is the design partner engagement?",
            ),
            FieldSpec(
                "feedbackScope",
                "Feedback scope",
                "What kind of feedback is the partner expected to provide?",
            ),
        ),
    ),
    "sla": DocumentSpec(
        slug="sla",
        display_name="Service Level Agreement",
        catalog_name="Service Level Agreement (SLA)",
        terms_url="https://commonpaper.com/standards/service-level-agreement/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "targetUptime",
                "Target uptime",
                "What uptime percentage is targeted? (e.g. '99.9%')",
            ),
            FieldSpec(
                "uptimeCredit",
                "Uptime credit",
                "Service credit when uptime is missed (e.g. '10% of monthly fees per 1% miss')",
            ),
            FieldSpec(
                "scheduledDowntime",
                "Scheduled downtime",
                "Allowed maintenance windows.",
            ),
        ),
    ),
    "psa": DocumentSpec(
        slug="psa",
        display_name="Professional Services Agreement",
        catalog_name="Professional Services Agreement (PSA)",
        terms_url="https://commonpaper.com/standards/professional-services-agreement/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "sowTerm",
                "SOW term",
                "Length of the statement of work.",
            ),
            FieldSpec(
                "fees",
                "Fees",
                "Hourly rate, fixed fee, or other pricing structure.",
            ),
            FieldSpec(
                "warrantyPeriod",
                "Warranty period",
                "How long are deliverables warranted after acceptance?",
            ),
        ),
    ),
    "dpa": DocumentSpec(
        slug="dpa",
        display_name="Data Processing Agreement",
        catalog_name="Data Processing Agreement (DPA)",
        terms_url="https://commonpaper.com/standards/data-processing-agreement/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "categoriesOfPersonalData",
                "Categories of personal data",
                "What types of personal data will be processed?",
            ),
            FieldSpec(
                "categoriesOfDataSubjects",
                "Categories of data subjects",
                "Whose data is involved? (e.g. 'customers, employees')",
            ),
            FieldSpec(
                "natureOfProcessing",
                "Nature and purpose of processing",
                "Why is the data being processed?",
            ),
            FieldSpec(
                "durationOfProcessing",
                "Duration of processing",
                "For how long will the data be processed?",
            ),
        ),
    ),
    "software_license": DocumentSpec(
        slug="software_license",
        display_name="Software License Agreement",
        catalog_name="Software License Agreement",
        terms_url="https://commonpaper.com/standards/software-license-agreement/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "licenseLimits",
                "License limits",
                "Seat counts, install counts, or usage caps.",
            ),
            FieldSpec(
                "fees",
                "Fees",
                "License fees and billing cadence.",
            ),
            FieldSpec(
                "permittedUses",
                "Permitted uses",
                "How may the licensee use the software?",
            ),
        ),
    ),
    "partnership": DocumentSpec(
        slug="partnership",
        display_name="Partnership Agreement",
        catalog_name="Partnership Agreement",
        terms_url="https://commonpaper.com/standards/partnership-agreement/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "program",
                "Program",
                "What is the partnership program? (e.g. 'reseller', 'referral')",
            ),
            FieldSpec(
                "term",
                "Term",
                "Duration of the partnership.",
            ),
            FieldSpec(
                "fees",
                "Fees / commission",
                "Compensation structure for the partner.",
            ),
        ),
    ),
    "pilot": DocumentSpec(
        slug="pilot",
        display_name="Pilot Agreement",
        catalog_name="Pilot Agreement",
        terms_url="https://commonpaper.com/standards/pilot-agreement/1.1",
        terms_version="1.1",
        extra_fields=(
            FieldSpec(
                "pilotPeriod",
                "Pilot period",
                "How long is the pilot? (e.g. '60 days')",
            ),
            FieldSpec(
                "evaluationPurposes",
                "Evaluation purposes",
                "What is the pilot evaluating?",
            ),
            FieldSpec(
                "generalCapAmount",
                "General liability cap",
                "Cap on total cumulative liability.",
            ),
        ),
    ),
    "baa": DocumentSpec(
        slug="baa",
        display_name="Business Associate Agreement",
        catalog_name="Business Associate Agreement (BAA)",
        terms_url="https://commonpaper.com/standards/business-associate-agreement/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "baaEffectiveDate",
                "BAA effective date",
                "When does the BAA take effect?",
            ),
            FieldSpec(
                "permittedUses",
                "Permitted uses & disclosures of PHI",
                "How may protected health information be used?",
            ),
            FieldSpec(
                "breachNotificationPeriod",
                "Breach notification period",
                "How quickly must breaches be reported? (e.g. '5 business days')",
            ),
        ),
    ),
    "ai_addendum": DocumentSpec(
        slug="ai_addendum",
        display_name="AI Addendum",
        catalog_name="AI Addendum",
        terms_url="https://commonpaper.com/standards/ai-addendum/1.0",
        terms_version="1.0",
        extra_fields=(
            FieldSpec(
                "trainingRestrictions",
                "Training restrictions",
                "Whether and how the AI may be trained on customer data.",
            ),
            FieldSpec(
                "improvementRestrictions",
                "Improvement restrictions",
                "Whether outputs may be used to improve the model.",
            ),
            FieldSpec(
                "trainingPurposes",
                "Training purposes",
                "Approved purposes for using customer data in training.",
            ),
        ),
    ),
}


def is_supported(slug: str) -> bool:
    return slug in DOCUMENTS


def get_document(slug: str) -> DocumentSpec:
    if slug not in DOCUMENTS:
        raise KeyError(f"Unknown document slug: {slug}")
    return DOCUMENTS[slug]


def supported_slugs() -> list[str]:
    return list(DOCUMENTS.keys())


# Lightweight type alias so other modules can constrain to known slugs at the
# type level when convenient. The runtime check still goes through `is_supported`.
DocumentSlug = Literal[
    "mutual_nda",
    "csa",
    "design_partner",
    "sla",
    "psa",
    "dpa",
    "software_license",
    "partnership",
    "pilot",
    "baa",
    "ai_addendum",
]
