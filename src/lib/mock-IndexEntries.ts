// src/lib/mockIndexEntries.ts

import type { ApiEntryResponse } from "./types";

export const mockIndexEntries: ApiEntryResponse[] = [
  {
    number: 1,
    total: 2,
    entry: `## Michelangelo 2024

**Study Title:** Lymphocyte count and mortality in emergency department patients with suspected infection  
**Authors:** Michelangelo A; Rossi B; Smith C  
**Year:** 2024  
**Journal:** Journal of Emergency Medicine  
**Doi:** 10.0000/example.2024.001  
**Keywords:** sepsis; emergency department; lymphocytes; mortality  
**Population:** ED patients with suspected infection (USA)  
**Sample Size:** N=341 ED; N=41 ICU; N=200 validation cohort  
**Predictor / Phenotyping Approach:** Lymphocyte count, log-transformed  
**Outcome:** In-hospital mortality  
**Timing:** Within first admission  
**Method:** Logistic regression, univariable and multivariable  
**Effect Size:** OR 1.2 (95% CI 1.02–1.4)  
**Performance / Outcomes:** AUC 0.78 (95% CI 0.73–0.84)  
**Notes:** Adjusted for SOFA and age  
**Summary:** Lower lymphocyte count was associated with increased in-hospital mortality among ED patients with suspected infection.  
**Source:** Table 2 and Results section, p. 7  

### STUDY-LEVEL SUMMARY

| Study | Country | Setting | Sample Size | Sepsis Def | Method | Clusters | Variables |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Michelangelo 2024 | USA | ED | N=341 ED; N=41 ICU; N=200 validation cohort | Suspected infection | Logistic regression | Not applicable | Lymphocyte count; SOFA; age |

### PHENOTYPE / CLUSTER-LEVEL TABLE

| Study | Cluster | Key Features | Clinical Description | Outcomes | Notes |
| --- | --- | --- | --- | --- | --- |
| Michelangelo 2024 | Not applicable | Low lymphocyte count; higher SOFA; older age | Higher-risk infection presentation | Increased in-hospital mortality | Not a clustering study |

---`,
  },
  {
    number: 2,
    total: 2,
    entry: `## Besen 2016

**Study Title:** Sepsis phenotypes and mortality risk in critically ill patients  
**Authors:** Besen BAMP; Romano TG; Nassar AP Jr; Taniguchi LU; Azevedo LCP; Mendes PV; Zampieri FG  
**Year:** 2016  
**Journal:** Critical Care  
**Doi:** 10.1186/example.2016.002  
**Keywords:** sepsis; phenotype; ICU; mortality  
**Population:** ICU patients with sepsis or septic shock (Brazil)  
**Sample Size:** N=286  
**Predictor / Phenotyping Approach:** Clinical phenotype assignment based on organ dysfunction and severity variables  
**Outcome:** ICU mortality and hospital mortality  
**Timing:** First 24 hours after ICU admission  
**Method:** Retrospective cohort analysis with phenotype comparison  
**Effect Size:** Mortality differed across phenotype groups  
**Performance / Outcomes:** ICU mortality and hospital mortality gradients reported by phenotype  
**Notes:** Phenotype definitions were derived from clinical severity and organ dysfunction patterns  
**Summary:** Clinical phenotypes separated sepsis patients into groups with different severity and mortality risk.  
**Source:** Results section and phenotype table  

### STUDY-LEVEL SUMMARY

| Study | Country | Setting | Sample Size | Sepsis Def | Method | Clusters | Variables |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Besen 2016 | Brazil | ICU | N=286 | Sepsis / septic shock | Retrospective cohort phenotype analysis | Multiple clinical phenotypes | Organ dysfunction; severity scores; labs; outcomes |

### PHENOTYPE / CLUSTER-LEVEL TABLE

| Study | Cluster | Key Features | Clinical Description | Outcomes | Notes |
| --- | --- | --- | --- | --- | --- |
| Besen 2016 | Lower-risk phenotype | Lower organ dysfunction; lower severity | Less severe sepsis presentation | Lower mortality | Exact label depends on paper terminology |
| Besen 2016 | Higher-risk phenotype | Higher SOFA; shock; organ dysfunction | More severe sepsis presentation | Higher mortality | Use paper-specific labels when available |

---`,
  },
];