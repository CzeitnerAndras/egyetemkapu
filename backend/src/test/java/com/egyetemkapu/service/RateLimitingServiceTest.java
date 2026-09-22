package com.egyetemkapu.service;

import io.github.bucket4j.Bucket;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RateLimitingServiceTest {

    private final RateLimitingService service = new RateLimitingService();

    @Test
    void sameKeyReusesBucket() {
        assertSame(service.resolveBucket("diak"), service.resolveBucket("diak"));
        assertSame(service.resolveForgotPasswordBucket("127.0.0.1"), service.resolveForgotPasswordBucket("127.0.0.1"));
    }

    @Test
    void mathForgotAndResetBucketsAreIndependent() {
        Bucket math = service.resolveBucket("127.0.0.1");
        Bucket forgot = service.resolveForgotPasswordBucket("127.0.0.1");
        Bucket reset = service.resolvePasswordResetBucket("127.0.0.1");

        assertNotSame(math, forgot);
        assertNotSame(forgot, reset);
        assertNotSame(math, reset);
    }

    @Test
    void authBucketsAreIndependentAndCapped() {
        assertNotSame(service.resolveLoginBucket("127.0.0.1"), service.resolveRegisterBucket("127.0.0.1"));
        assertNotSame(service.resolveLoginBucket("127.0.0.1"), service.resolveForgotPasswordBucket("127.0.0.1"));

        Bucket login = service.resolveLoginBucket("10.0.0.1");
        for (int i = 0; i < 10; i++) {
            assertTrue(login.tryConsume(1));
        }
        assertFalse(login.tryConsume(1));
    }

    @Test
    void mathBucketAllowsFiveRequestsThenRejects() {
        Bucket bucket = service.resolveBucket("diak");
        for (int i = 0; i < 5; i++) {
            assertTrue(bucket.tryConsume(1));
        }
        assertFalse(bucket.tryConsume(1));
    }
}
