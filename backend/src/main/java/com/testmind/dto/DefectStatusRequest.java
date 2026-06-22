package com.testmind.dto;

import com.testmind.model.DefectStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DefectStatusRequest {

    @NotNull(message = "Status is required")
    private DefectStatus status;
}
