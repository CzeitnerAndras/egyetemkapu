package com.egyetemkapu.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RecaptchaServiceTest {

    @Test
    void verifyAcceptsASuccessfulGoogleResponse() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(requestTo(RecaptchaService.VERIFY_URL))
                .andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));
        RecaptchaService service = new RecaptchaService(restTemplate, "secret", "site");

        assertTrue(service.verify("token", "1.2.3.4"));
        server.verify();
    }

    @Test
    void verifyRejectsABlankTokenWithoutCallingGoogle() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        RecaptchaService service = new RecaptchaService(restTemplate, "secret", "site");

        assertFalse(service.verify("  ", "1.2.3.4"));
        server.verify();
    }

    @Test
    void verifyRejectsWhenTheSecretIsMissing() {
        RecaptchaService service = new RecaptchaService(new RestTemplate(), "", "site");

        assertFalse(service.verify("token", "1.2.3.4"));
    }
}
