#include <stdint.h>

static inline uint32_t popcount64(uint64_t x) {
#if defined(__wasm__)
    return __builtin_popcountll(x);
#else
    uint32_t c = 0;
    while (x) { x &= (x - 1); ++c; }
    return c;
#endif
}

extern "C" {

// Deterministic 64-bit profile evaluation.
// Return -1 only for an explicit exclusion/conflict. Missing positive signals are
// treated as unknown, not false, and therefore reduce confidence rather than eligibility.
__attribute__((visibility("default")))
int match_score(uint64_t profile,
                uint64_t required,
                uint64_t preferred,
                uint64_t excluded,
                int stage_state,
                int interest_state) {
    if ((profile & excluded) != 0ULL) return -1;

    const uint32_t req_total = popcount64(required);
    const uint32_t req_hits  = popcount64(profile & required);
    const uint32_t pref_total = popcount64(preferred);
    const uint32_t pref_hits  = popcount64(profile & preferred);

    // Start neutral. Stage and interest are explicit, high-information signals.
    int score = 44;
    // states: -1 explicit mismatch, 0 unknown, 1 match
    score += stage_state > 0 ? 22 : (stage_state < 0 ? -22 : 0);
    score += interest_state > 0 ? 18 : (interest_state < 0 ? -8 : 0);

    if (req_total) score += (int)((req_hits * 8U) / req_total);
    if (pref_total) score += (int)((pref_hits * 16U) / pref_total);

    if (score < 1) score = 1;
    if (score > 99) score = 99;
    return score;
}

__attribute__((visibility("default")))
uint32_t bit_count(uint64_t value) { return popcount64(value); }

__attribute__((visibility("default")))
uint32_t engine_version() { return 4; }

}
