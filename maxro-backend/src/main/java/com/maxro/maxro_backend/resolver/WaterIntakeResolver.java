package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.model.WaterIntake;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.WaterIntakeService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Controller
public class WaterIntakeResolver {

    private final WaterIntakeService waterIntakeService;
    private final SecurityContextHelper securityContextHelper;

    public WaterIntakeResolver(WaterIntakeService waterIntakeService,
                               SecurityContextHelper securityContextHelper) {
        this.waterIntakeService = waterIntakeService;
        this.securityContextHelper = securityContextHelper;
    }

    @QueryMapping
    public WaterIntake getWaterIntake(@Argument String date) {
        return waterIntakeService.getWaterIntake(
                securityContextHelper.getCurrentUserId(), LocalDate.parse(date));
    }

    @QueryMapping
    public List<WaterIntake> getWaterIntakeLogs(@Argument String startDate, @Argument String endDate) {
        return waterIntakeService.getWaterIntakeLogs(
                securityContextHelper.getCurrentUserId(),
                LocalDate.parse(startDate), LocalDate.parse(endDate));
    }

    @MutationMapping
    public WaterIntake logWaterIntake(@Argument Map<String, Object> input) {
        String userId = securityContextHelper.getCurrentUserId();
        LocalDate date = LocalDate.parse((String) input.get("date"));
        double amountOz = ((Number) input.get("amountOz")).doubleValue();
        return waterIntakeService.logWater(userId, date, amountOz);
    }
}
