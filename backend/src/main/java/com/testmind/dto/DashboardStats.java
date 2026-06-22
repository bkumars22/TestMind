package com.testmind.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {

    private Long totalProjects;
    private Long activeTestRuns;
    private Long openDefects;
    private Double avgRiskScore;
}
