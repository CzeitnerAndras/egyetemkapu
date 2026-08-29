package com.egyetemkapu.security;

import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private UserRepository userRepository;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private Authentication runFilterWithToken(String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (token != null) {
            request.addHeader("Authorization", "Bearer " + token);
        }

        new JwtAuthenticationFilter(jwtUtil, userRepository)
                .doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        return SecurityContextHolder.getContext().getAuthentication();
    }

    private void givenUserWithRole(String username, String role) {
        User user = new User();
        user.setUsername(username);
        user.setRole(role);

        when(jwtUtil.validateToken("valid-token")).thenReturn(true);
        when(jwtUtil.extractUsername("valid-token")).thenReturn(username);
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
    }

    @Test
    void adminUser_GetsAdminAuthority() throws Exception {
        givenUserWithRole("admin_elek", "ROLE_ADMIN");

        Authentication auth = runFilterWithToken("valid-token");

        assertNotNull(auth);
        assertEquals("admin_elek", auth.getName());
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void normalUser_DoesNotGetAdminAuthority() throws Exception {
        givenUserWithRole("teszt_elek", "ROLE_USER");

        Authentication auth = runFilterWithToken("valid-token");

        assertNotNull(auth);
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
        assertFalse(auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void rolePrefixIsAddedWhenMissing() throws Exception {
        givenUserWithRole("admin_elek", "ADMIN");

        Authentication auth = runFilterWithToken("valid-token");

        assertNotNull(auth);
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void blankRole_FallsBackToUserRole() throws Exception {
        givenUserWithRole("teszt_elek", "");

        Authentication auth = runFilterWithToken("valid-token");

        assertNotNull(auth);
        assertTrue(auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_USER")));
    }

    @Test
    void deletedUser_LeavesContextUnauthenticated() throws Exception {
        when(jwtUtil.validateToken("valid-token")).thenReturn(true);
        when(jwtUtil.extractUsername("valid-token")).thenReturn("torolt_elek");
        when(userRepository.findByUsername("torolt_elek")).thenReturn(Optional.empty());

        assertNull(runFilterWithToken("valid-token"));
    }

    @Test
    void invalidToken_LeavesContextUnauthenticated() throws Exception {
        when(jwtUtil.validateToken("rossz-token")).thenReturn(false);

        assertNull(runFilterWithToken("rossz-token"));
    }

    @Test
    void missingHeader_LeavesContextUnauthenticated() throws Exception {
        assertNull(runFilterWithToken(null));
    }
}
