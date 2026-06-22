package com.testmind.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GapReportResponse {

    private Long id;
    private String gapCategory;
    private String description;
    private Double priorityScore;
    private String affectedRequirement;
}
