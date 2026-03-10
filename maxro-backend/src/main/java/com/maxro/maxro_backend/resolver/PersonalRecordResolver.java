package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.model.PersonalRecord;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.PersonalRecordService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class PersonalRecordResolver {

    private final PersonalRecordService personalRecordService;
    private final SecurityContextHelper securityContextHelper;

    public PersonalRecordResolver(PersonalRecordService personalRecordService,
                                  SecurityContextHelper securityContextHelper) {
        this.personalRecordService = personalRecordService;
        this.securityContextHelper = securityContextHelper;
    }

    @QueryMapping
    public List<PersonalRecord> getPersonalRecords() {
        return personalRecordService.getPersonalRecords(securityContextHelper.getCurrentUserId());
    }

    @QueryMapping
    public List<PersonalRecord> getPersonalRecordsByExercise(@Argument String exerciseName) {
        return personalRecordService.getPersonalRecordsByExercise(
                securityContextHelper.getCurrentUserId(), exerciseName);
    }
}
