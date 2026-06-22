package com.testmind.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Builder
public class StoryAnalysisResponse {

    private Long id;
    private String jiraStoryId;
    private String jiraSummary;
    private String businessRules;
    private String acceptanceCriteria;
    private String edgeCases;
    private String dataRules;
    private OffsetDateTime analyzedAt;
}
