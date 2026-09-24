package com.egyetemkapu.controller;

import com.egyetemkapu.exception.TokenRefreshException;
import com.egyetemkapu.model.RefreshToken;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import com.egyetemkapu.security.AuthCookies;
import com.egyetemkapu.security.JwtUtil;
import com.egyetemkapu.security.PasswordPolicy;
import com.egyetemkapu.service.EmailVerificationService;
import com.egyetemkapu.service.PasswordResetService;
import com.egyetemkapu.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private static final String EMAIL = "diak@egyetemkapu.hu";
    private static final String PASSWORD = "Jelszo1!";

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private PasswordResetService passwordResetService;
    @Mock private EmailVerificationService emailVerificationService;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = controller(false);
    }

    @Test
    void login_WrongPassword_ReturnsGenericErrorWithoutCookies() {
        User user = verifiedUser();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("rossz", "hash")).thenReturn(false);
        MockHttpServletResponse response = new MockHttpServletResponse();

        ResponseEntity<?> result = controller.login(Map.of("email", EMAIL, "password", "rossz"), response);

        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        assertEquals("Hibás e-mail cím vagy jelszó!", body(result).get("error"));
        assertTrue(response.getHeaders(HttpHeaders.SET_COOKIE).isEmpty());
        verify(refreshTokenService, never()).createRefreshToken(any());
    }

    @Test
    void login_UnverifiedEmail_ReturnsForbiddenWithoutCookies() {
        User user = verifiedUser();
        user.setEmailVerified(false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, "hash")).thenReturn(true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        ResponseEntity<?> result = controller.login(Map.of("email", EMAIL, "password", PASSWORD), response);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        assertEquals("Erősítsd meg az e-mail címed a belépéshez.", body(result).get("error"));
        assertTrue(response.getHeaders(HttpHeaders.SET_COOKIE).isEmpty());
    }

    @Test
    void login_VerifiedUser_SetsHttpOnlyCookiesAndOmitsTokensFromBody() {
        User user = verifiedUser();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, "hash")).thenReturn(true);
        when(refreshTokenService.createRefreshToken(4L))
                .thenReturn(new RefreshTokenService.IssuedRefreshToken("nyers-refresh"));
        when(jwtUtil.generateToken("diak")).thenReturn("jwt-access");
        MockHttpServletResponse response = new MockHttpServletResponse();

        ResponseEntity<?> result = controller.login(Map.of("email", EMAIL, "password", PASSWORD), response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(Boolean.TRUE, body(result).get("ok"));
        assertFalse(body(result).containsKey("token"));
        assertSessionCookies(response, false, "jwt-access", "nyers-refresh");
    }

    @Test
    void login_SecureFlag_MarksCookiesSecure() {
        controller = controller(true);
        User user = verifiedUser();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, "hash")).thenReturn(true);
        when(refreshTokenService.createRefreshToken(4L))
                .thenReturn(new RefreshTokenService.IssuedRefreshToken("nyers-refresh"));
        when(jwtUtil.generateToken("diak")).thenReturn("jwt-access");
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.login(Map.of("email", EMAIL, "password", PASSWORD), response);

        assertSessionCookies(response, true, "jwt-access", "nyers-refresh");
    }

    @Test
    void register_WeakPassword_RejectsBeforeLookup() {
        ResponseEntity<?> result = controller.register(Map.of(
                "username", "diak",
                "email", EMAIL,
                "password", "gyenge"));

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        assertEquals(PasswordPolicy.WEAK_PASSWORD_MESSAGE, body(result).get("error"));
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void register_InvalidUsernameOrEmail_ReturnsGenericError() {
        ResponseEntity<?> result = controller.register(Map.of(
                "username", "a b",
                "email", "nem-email",
                "password", PASSWORD));

        assertEquals(HttpStatus.BAD_REQUEST, result.getStatusCode());
        assertEquals("A regisztráció nem sikerült.", body(result).get("error"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_ExistingUnverifiedEmail_ResendsLinkWithoutCreatingUser() {
        User existing = verifiedUser();
        existing.setEmailVerified(false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(existing));

        ResponseEntity<?> result = controller.register(Map.of(
                "username", "masik",
                "email", "  " + EMAIL + "  ",
                "password", PASSWORD));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(EmailVerificationService.ACCEPTED_MESSAGE, body(result).get("message"));
        verify(emailVerificationService).issueFor(existing);
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_ExistingVerifiedEmail_DoesNotRevealAccountOrResend() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(verifiedUser()));

        ResponseEntity<?> result = controller.register(Map.of(
                "username", "ujnev",
                "email", EMAIL,
                "password", PASSWORD));

        assertEquals(EmailVerificationService.ACCEPTED_MESSAGE, body(result).get("message"));
        verify(emailVerificationService, never()).issueFor(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_TakenUsername_ReturnsSameMessageWithoutSaving() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(userRepository.findByUsername("diak")).thenReturn(Optional.of(verifiedUser()));

        ResponseEntity<?> result = controller.register(Map.of(
                "username", "diak",
                "email", EMAIL,
                "password", PASSWORD));

        assertEquals(EmailVerificationService.ACCEPTED_MESSAGE, body(result).get("message"));
        verify(userRepository, never()).save(any());
        verify(emailVerificationService, never()).issueFor(any());
    }

    @Test
    void register_NewUser_SavesUnverifiedAccountAndSendsLink() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(userRepository.findByUsername("diak")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(PASSWORD)).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<?> result = controller.register(Map.of(
                "username", " diak ",
                "email", EMAIL,
                "password", PASSWORD));

        assertEquals(HttpStatus.OK, result.getStatusCode());
        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertEquals("diak", saved.getValue().getUsername());
        assertEquals(EMAIL, saved.getValue().getEmail());
        assertEquals("hash", saved.getValue().getPassword());
        assertFalse(saved.getValue().isEmailVerified());
        verify(emailVerificationService).issueFor(saved.getValue());
    }

    @Test
    void refresh_RotatesCookies() {
        User user = verifiedUser();
        RefreshToken stored = new RefreshToken();
        stored.setUser(user);
        when(refreshTokenService.findByRawToken("regi")).thenReturn(Optional.of(stored));
        when(refreshTokenService.verifyExpiration(stored)).thenReturn(stored);
        when(refreshTokenService.rotate(stored)).thenReturn(new RefreshTokenService.IssuedRefreshToken("uj-refresh"));
        when(jwtUtil.generateToken("diak")).thenReturn("uj-jwt");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(AuthCookies.REFRESH, "regi"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        ResponseEntity<?> result = controller.refreshToken(request, response);

        assertEquals(Boolean.TRUE, body(result).get("ok"));
        assertSessionCookies(response, false, "uj-jwt", "uj-refresh");
    }

    @Test
    void refresh_MissingToken_Throws() {
        when(refreshTokenService.findByRawToken(null)).thenReturn(Optional.empty());

        assertThrows(TokenRefreshException.class,
                () -> controller.refreshToken(new MockHttpServletRequest(), new MockHttpServletResponse()));
    }

    @Test
    void logout_DeletesRefreshTokensAndClearsCookies() {
        User user = verifiedUser();
        RefreshToken stored = new RefreshToken();
        stored.setUser(user);
        when(refreshTokenService.findByRawToken("regi")).thenReturn(Optional.of(stored));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(AuthCookies.REFRESH, "regi"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        ResponseEntity<?> result = controller.logout(request, response);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(refreshTokenService).deleteByUserId(4L);
        List<String> cookies = response.getHeaders(HttpHeaders.SET_COOKIE);
        assertTrue(cookies.stream().anyMatch(cookie ->
                cookie.startsWith(AuthCookies.ACCESS + "=") && cookie.contains("Max-Age=0")));
        assertTrue(cookies.stream().anyMatch(cookie ->
                cookie.startsWith(AuthCookies.REFRESH + "=") && cookie.contains("Max-Age=0")));
    }

    @Test
    void verifyEmail_MapsServiceResult() {
        when(emailVerificationService.verify("rossz"))
                .thenReturn(Optional.of(EmailVerificationService.INVALID_TOKEN_MESSAGE));
        when(emailVerificationService.verify("jo")).thenReturn(Optional.empty());

        ResponseEntity<?> invalid = controller.verifyEmail(Map.of("token", "rossz"));
        ResponseEntity<?> valid = controller.verifyEmail(Map.of("token", "jo"));

        assertEquals(HttpStatus.BAD_REQUEST, invalid.getStatusCode());
        assertEquals(EmailVerificationService.INVALID_TOKEN_MESSAGE, body(invalid).get("error"));
        assertEquals(HttpStatus.OK, valid.getStatusCode());
        assertEquals(EmailVerificationService.VERIFIED_MESSAGE, body(valid).get("message"));
    }

    private AuthController controller(boolean cookieSecure) {
        return new AuthController(
                userRepository,
                passwordEncoder,
                jwtUtil,
                refreshTokenService,
                passwordResetService,
                emailVerificationService,
                cookieSecure);
    }

    private static User verifiedUser() {
        User user = new User();
        user.setId(4L);
        user.setUsername("diak");
        user.setEmail(EMAIL);
        user.setPassword("hash");
        user.setEmailVerified(true);
        return user;
    }

    private static Map<?, ?> body(ResponseEntity<?> result) {
        return (Map<?, ?>) result.getBody();
    }

    private static void assertSessionCookies(
            MockHttpServletResponse response,
            boolean secure,
            String accessToken,
            String refreshToken) {
        List<String> cookies = response.getHeaders(HttpHeaders.SET_COOKIE);
        String access = cookies.stream()
                .filter(cookie -> cookie.startsWith(AuthCookies.ACCESS + "="))
                .findFirst()
                .orElseThrow();
        String refresh = cookies.stream()
                .filter(cookie -> cookie.startsWith(AuthCookies.REFRESH + "="))
                .findFirst()
                .orElseThrow();

        assertTrue(access.startsWith(AuthCookies.ACCESS + "=" + accessToken));
        assertTrue(access.contains("Path=/api"));
        assertFalse(access.contains("Path=/api/auth"));
        assertTrue(access.contains("HttpOnly"));
        assertTrue(access.contains("SameSite=Lax"));
        assertEquals(secure, access.contains("Secure"));

        assertTrue(refresh.startsWith(AuthCookies.REFRESH + "=" + refreshToken));
        assertTrue(refresh.contains("Path=/api/auth"));
        assertTrue(refresh.contains("HttpOnly"));
        assertEquals(secure, refresh.contains("Secure"));
    }
}
