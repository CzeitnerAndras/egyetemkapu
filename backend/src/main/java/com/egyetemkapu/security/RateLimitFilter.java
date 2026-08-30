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

    public RateLimitFilter(RateLimitingService rateLimitingService) {
        this.rateLimitingService = rateLimitingService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return PUBLIC_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String path = request.getRequestURI();
        
        if (path.startsWith("/api/ai") || path.startsWith("/api/tools") || path.startsWith("/api/calculator")) {
            
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication != null && authentication.isAuthenticated() && !authentication.getName().equals("anonymousUser")) {
                String username = authentication.getName();
                Bucket tokenBucket = rateLimitingService.resolveBucket(username);

                if (!tokenBucket.tryConsume(1)) {
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write("{\"error\": \"Túl sok kérés! Kérlek várj egy percet a következő AI vagy kalkulátor hívásig.\"}");
                    return;
                }
            } else {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("{\"error\": \"Bejelentkezés szükséges a funkció használatához!\"}");
                return;
            }
        }
        
        filterChain.doFilter(request, response);
    }
}