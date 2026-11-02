package com.groceryshop.barcode;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Open Food Facts client (world.openfoodfacts.org) — a free, open, crowdsourced
 * food product database. Provides two things:
 *
 * <ul>
 *   <li>{@link #lookup(String)} — fetch one product by its barcode.</li>
 *   <li>{@link #search(String, int)} — full-text product search by name, used by
 *       the "search online" and "attach barcodes to my products" tools.</li>
 * </ul>
 *
 * Every call is best-effort: short timeouts and any failure simply means "nothing
 * found", so scans/tools never hang or error because the network is down. Results
 * (including misses) are cached briefly to avoid hammering the API.
 */
@Service
public class OpenFoodFactsService {

    private static final Logger log = LoggerFactory.getLogger(OpenFoodFactsService.class);

    private static final String BASE_URL = "https://world.openfoodfacts.org/api/v2/product/";
    private static final String FIELDS =
            "code,product_name,product_name_en,generic_name,brands,categories,quantity,image_front_small_url";
    /** Full-text search service (Search-a-licious) — far more reliable than the legacy cgi/search.pl. */
    private static final String SEARCH_URL = "https://search.openfoodfacts.org/search";
    private static final String USER_AGENT =
            "GroceryShop/1.0 (contact: grocery.shop.no.reply@gmail.com)";
    private static final long CACHE_TTL_MS = Duration.ofHours(6).toMillis();
    private static final int CACHE_MAX = 1000;
    private static final int SEARCH_LIMIT_MAX = 50;

    private final RestClient restClient;
    private final Map<String, CacheEntry<OffProduct>> productCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<List<OffSearchHit>>> searchCache = new ConcurrentHashMap<>();

    public OpenFoodFactsService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    /** Fetch a single product by barcode. Empty when unknown or unreachable. */
    public Optional<OffProduct> lookup(String barcode) {
        if (barcode == null || barcode.isBlank()) {
            return Optional.empty();
        }
        String key = barcode.trim();
        CacheEntry<OffProduct> cached = productCache.get(key);
        if (cached != null && !cached.expired()) {
            return Optional.ofNullable(cached.value());
        }
        OffProduct product = fetchProduct(key);
        if (productCache.size() >= CACHE_MAX) {
            productCache.clear();
        }
        productCache.put(key, new CacheEntry<>(product, System.currentTimeMillis() + CACHE_TTL_MS));
        return Optional.ofNullable(product);
    }

    /** Full-text product search by name. Returns an empty list on any failure. */
    public List<OffSearchHit> search(String query, int limit) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) {
            return List.of();
        }
        int size = Math.min(Math.max(1, limit), SEARCH_LIMIT_MAX);
        String key = q.toLowerCase() + "|" + size;
        CacheEntry<List<OffSearchHit>> cached = searchCache.get(key);
        if (cached != null && !cached.expired()) {
            return cached.value();
        }
        List<OffSearchHit> hits = fetchSearch(q, size);
        if (searchCache.size() >= CACHE_MAX) {
            searchCache.clear();
        }
        searchCache.put(key, new CacheEntry<>(hits, System.currentTimeMillis() + CACHE_TTL_MS));
        return hits;
    }

    private OffProduct fetchProduct(String barcode) {
        try {
            OffResponse response = restClient.get()
                    .uri(BASE_URL + barcode + ".json?fields=" + FIELDS)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .retrieve()
                    .body(OffResponse.class);
            if (response == null || response.status() != 1 || response.product() == null) {
                return null;
            }
            return response.product();
        } catch (Exception ex) {
            log.debug("Open Food Facts lookup failed for {}: {}", barcode, ex.getMessage());
            return null;
        }
    }

    private List<OffSearchHit> fetchSearch(String query, int size) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(SEARCH_URL)
                    .queryParam("q", query)
                    .queryParam("page_size", size)
                    .build()
                    .encode()
                    .toUri();
            OffSearchResponse response = restClient.get()
                    .uri(uri)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .retrieve()
                    .body(OffSearchResponse.class);
            if (response == null || response.hits() == null) {
                return List.of();
            }
            return response.hits();
        } catch (Exception ex) {
            log.debug("Open Food Facts search failed for '{}': {}", query, ex.getMessage());
            return List.of();
        }
    }

    private record CacheEntry<T>(T value, long expiresAt) {
        boolean expired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    private record OffResponse(int status, OffProduct product) {
    }

    private record OffSearchResponse(int count, List<OffSearchHit> hits) {
    }

    public record OffProduct(
            String code,
            @JsonProperty("product_name") String productName,
            @JsonProperty("product_name_en") String productNameEn,
            @JsonProperty("generic_name") String genericName,
            String brands,
            String categories,
            String quantity,
            @JsonProperty("image_front_small_url") String imageFrontSmallUrl
    ) {
    }

    /** One hit from the full-text search service (note: {@code brands} is an array here). */
    public record OffSearchHit(
            String code,
            @JsonProperty("product_name") String productName,
            @JsonProperty("product_name_en") String productNameEn,
            @JsonProperty("generic_name") String genericName,
            List<String> brands,
            String categories,
            String quantity,
            @JsonProperty("image_front_small_url") String imageFrontSmallUrl
    ) {
    }
}
