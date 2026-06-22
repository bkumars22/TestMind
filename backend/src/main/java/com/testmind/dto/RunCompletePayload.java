package com.testmind.dto;

import com.testmind.model.TestRunStatus;
import lombok.Data;

import java.util.List;

@Data
public class RunCompletePayload {

    private TestRunStatus status;
    private Double riskScore;
    private List<DefectResponse> defects;
}
