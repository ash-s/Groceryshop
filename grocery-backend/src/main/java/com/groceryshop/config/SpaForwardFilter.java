package com.groceryshop.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * The whole app ships as one program: this backend also serves the single-page
 * frontend. Any GET for a page route (for example /admin/billing) is forwarded
 * to index.html so the browser can hand it to the client-side router. Real API
 * calls and files with an extension are left alone.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class SpaForwardFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        boolean isApi = uri.startsWith("/api") || uri.startsWith("/uploads");
        boolean isFile = uri.contains(".");
        boolean isGet = "GET".equals(request.getMethod());
        String accept = request.getHeader("Accept");
        boolean wantsHtml = accept == null || accept.contains("text/html") || accept.contains("*/*");

        if (isGet && !isApi && !isFile && wantsHtml) {
            request.getRequestDispatcher("/index.html").forward(request, response);
            return;
        }
        filterChain.doFilter(request, response);
    }
}
