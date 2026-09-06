package com.egyetemkapu.security;

import com.egyetemkapu.service.RateLimitingService;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_PATHS = Set.of("/api/tools/calculator/count");

    private final RateLimitingService rateLimitingService;
    private final ClientIpResolver clientIpResolver;

    public RateLimitFilter(RateLimitingService rateLimitingService, ClientIpResolver clientIpResolver) {
        this.rateLimitingService = rateLimitingService;
        this.clientIpResolver = clientIpResolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return PUBLIC_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String path = request.getRequestURI();

        if ("POST".equalsIgnoreCase(request.getMethod()) && "/api/auth/forgot-password".equals(path)) {
            if (!consume(rateLimitingService.resolveForgotPasswordBucket(clientIpResolver.resolve(request)), response,
                    "Túl sok jelszó-visszaállítási kérés. Próbáld újra később.")) {
                return;
            }
        } else if ("POST".equalsIgnoreCase(request.getMethod()) && "/api/auth/reset-password".equals(path)) {
            if (!consume(rateLimitingService.resolvePasswordResetBucket(clientIpResolver.resolve(request)), response,
                    "Túl sok jelszó-visszaállítási kísérlet. Próbáld újra később.")) {
                return;
            }
        }
        
        boolean isProtectedTool = path.startsWith("/api/ai") || path.startsWith("/api/tools");
        boolean isCreditCalculator = path.startsWith("/api/calculator");

        if (isProtectedTool || isCreditCalculator) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            boolean isAuthenticated = authentication != null
                    && authentication.isAuthenticated()
                    && !"anonymousUser".equals(authentication.getName());

            if (isAuthenticated) {
                String username = authentication.getName();
                Bucket tokenBucket = rateLimitingService.resolveBucket(username);

                if (!tokenBucket.tryConsume(1)) {
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write("{\"error\": \"Túl sok kérés! Kérlek várj egy percet a következő AI vagy kalkulátor hívásig.\"}");
                    return;
                }
            } else if (isProtectedTool) {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("{\"error\": \"Bejelentkezés szükséges a funkció használatához!\"}");
                return;
            }
        }
        
        filterChain.doFilter(request, response);
    }

    private boolean consume(Bucket tokenBucket, HttpServletResponse response, String errorMessage) throws IOException {
        if (tokenBucket.tryConsume(1)) {
            return true;
        }
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"error\": \"" + errorMessage + "\"}");
        return false;
    }
}