package com.testmind.dto;

import lombok.Data;

@Data
public class TestCaseReviewRequest {

    private String status;
    private String reviewerNotes;
    private String updatedTitle;
    private String updatedExpectedResult;
}
