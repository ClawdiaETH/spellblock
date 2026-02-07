"""
SpellBlock Offensive Word Blocklist
====================================
Words that must NOT appear in the game dictionary.

Criteria: Would this word be unacceptable if it appeared on:
  - The on-chain leaderboard  
  - Clawdia's social media recap ("Today's top word was ___!")
  - A screenshot shared in crypto media

Categories:
  1. Racial/ethnic slurs
  2. Gendered/sexual slurs  
  3. Homophobic/transphobic slurs
  4. Ableist slurs
  5. Severe profanity
  6. Crude sexual terms
  7. Crude bodily terms
  8. Other offensive terms

NOTE: This is an EXACT-MATCH blocklist. Words containing these as 
substrings (e.g. "assassin" containing "ass") are NOT affected.
"""

BLOCKLIST = set()

# ============================================================
# 1. RACIAL / ETHNIC SLURS
# ============================================================
BLOCKLIST.update([
    "nigger", "niggers", "nigga", "niggas",
    "chink", "chinks",
    "gook", "gooks",
    "kike", "kikes",
    "spic", "spics",
    "wop", "wops",
    "wetback", "wetbacks",
    "beaner", "beaners",
    "redskin", "redskins",
    "darky", "darkey", "darkies",
    "honky", "honkies",
    "gringo", "gringos",
    "raghead", "ragheads",
    "spook", "spooks",  # racial slur context (also ghost, but too risky)
    "coon", "coons",    # racial slur (raccoon abbreviation too, but too risky)
    "sambo",
    "pickaninny",
    "jigaboo",
    "mulatto", "mulattos",  # considered offensive/outdated racial term
    "negro", "negros", "negroes",  # outdated, offensive in modern usage
    "ghetto", "ghettos",  # can be used as slur
    "snigger", "sniggered",  # contains racial slur as substring
])

# ============================================================
# 2. GENDERED / SEXUAL SLURS
# ============================================================
BLOCKLIST.update([
    "bitch", "bitched", "bitches", "bitching", "bitchy",
    "cunt", "cunts",
    "slut", "sluts", "slutty",
    "twat", "twats",
    "whore", "whores", "whoring",
    "hooker", "hookers",
    "harlot", "harlots",
    "pimp", "pimps", "pimped", "pimping",
])

# ============================================================
# 3. HOMOPHOBIC / TRANSPHOBIC SLURS
# ============================================================
BLOCKLIST.update([
    "fag", "fags", "faggot", "faggots",
    "dyke", "dykes",
    "lesbo", "lesbos",
    "tranny", "trannies",
    "shemale", "shemales",
    "homo", "homos",  # used as slur
])

# ============================================================
# 4. ABLEIST SLURS
# ============================================================
BLOCKLIST.update([
    "retard", "retards", "retarded",
    "cripple", "crippled", "cripples",
    "spaz", "spazz", "spastic",
])

# ============================================================
# 5. SEVERE PROFANITY
# ============================================================
BLOCKLIST.update([
    "fuck", "fucked", "fucker", "fuckers", "fucking", "fucks",
    "shit", "shits", "shitty", "shittier", "shitting", "bullshit",
    "ass",       # standalone only - "assassin" etc preserved
    "asshole", "assholes",
    "goddamn",
    "bastard", "bastards",
    "piss", "pissed", "pisses", "pissing",
    "crap", "crapped", "crapping", "crappy", "craps",
])

# ============================================================
# 6. CRUDE SEXUAL / ANATOMICAL TERMS
# ============================================================
BLOCKLIST.update([
    # Genitalia (when the word's primary/common usage is sexual)
    "cock", "cocks",       # standalone - "peacock" etc preserved
    "dick", "dicks",       # standalone - "dicker" etc preserved  
    "vagina", "vaginal",
    "scrotum",
    "tits", "titty", "titties",
    "nipple", "nipples",
    "dildo", "dildos",
    "clitoris",
    
    # Sexual acts/references
    "rape", "raped", "rapes", "raping", "rapist",
    "orgasm", "orgasms",
    "ejaculate",
    "masturbate",
    "erection",            # "erect" stays - legitimate primary meaning
    "blowjob",
    "handjob",
    "pedo", "pedos",
    
    # Sexual orientation used as insult (already covered above)
])

# ============================================================
# 7. CRUDE BODILY / SCATOLOGICAL TERMS
# ============================================================
BLOCKLIST.update([
    "anus",
    "snot",     # borderline, but "Today's word was SNOT" = gross. Remove.
    "booger", "boogers",
    "barf", "barfed", "barfing",
])

# ============================================================
# 8. ADDITIONAL SEXUAL / ANATOMICAL (would fail leaderboard test)
# ============================================================
BLOCKLIST.update([
    "erotic", "erotica",
    "fetish", "fetishes",
    "libido",
    "coitus",
    "genital", "genitals",
    "testicle", "testicles",
    "phallus",
    "anal",
    "rectal",
])

# ============================================================
# 9. ABLEIST / ARCHAIC SLURS (additional)
# ============================================================
BLOCKLIST.update([
    "cretin", "cretins",
    "imbecile", "imbeciles",
    "midget", "midgets",
    "leper", "lepers",
    "wench",
    "tramp", "tramps",  # gendered slur usage
])

# ============================================================
# 10. OTHER OFFENSIVE / PROBLEMATIC TERMS
# ============================================================
BLOCKLIST.update([
    "nazi", "nazis",
    "lynch", "lynched", "lynches", "lynching",  # racial violence connotation
    "redneck", "rednecks",  # classist slur
    "jihad", "jihads", "jihadist", "jihadists",  # loaded term
    "rapist", "rapists",  # missed inflection of rape
])

# ============================================================
# 11. LONGER INFLECTIONS (9-12 letters)
# Added when max word length was extended from 8 to 12.
# Direct inflected forms of already-blocked words.
# ============================================================
BLOCKLIST.update([
    # sexual / anatomical inflections
    "cocksucker", "cocksuckers",
    "ejaculated", "ejaculating", "ejaculation",
    "erections",
    "erotically", "eroticism",
    "fetishism", "fetishist",
    "genitalia",
    "masturbated", "masturbates", "masturbating", "masturbation",
    "titillating", "titillation",
    # profanity inflections
    "goddamned",
    "motherfucker",
    "shittiest",
    # slur inflections
    "retardation",
    "sniggering",
    # other offensive
    "prostitute", "prostituted", "prostitutes", "prostituting", "prostitution",
    "transvestite",
    "whorehouse",
])
# FALSE POSITIVES VERIFIED SAFE (contain blocked substrings but are innocent):
#   advisement, altitudes, amusement, analgesic, analogues, angiosperms,
#   antithesis, antitrust, attitudes, basements, certitude, cockroach,
#   destitute, dietitian, endorsement, fortitude, gratitude, hepatitis,
#   homogeneity, homophones, hysterectomy, ineptitude, investiture,
#   latitudes, manuscript, multitude, pedometer, pimpernel, platitude,
#   practitioner, rectitude, restitution, retardant, secreting, sophomore,
#   stalactites, stitching, superstition, therapeutic, torpedoes

# ============================================================
# EDGE CASES - EXPLICITLY KEPT (documenting the decision)
# ============================================================
# These were considered but deliberately NOT blocked:
# 
# KEPT - too common / mild profanity:
#   hell, damn, damned, damns, damning, butt, butts, jerk, idiot, moron,
#   stupid, dumb, loser, freak, suck, sucker, screw, bang, stoned, wasted,
#   crack, blow, hoe (garden tool)
#   
# KEPT - legitimate primary meaning:
#   erect, groin, breast/breasts (also poultry), thigh, drug, weed, meth,
#   murder, kill, death, poison, slave/slavery, vomit, corpse, blood,
#   cocky (arrogant), cocktail, peacock, woodcock, lunatic
#   cocaine, heroin, opium (factual terms)
#   suicide, genocide, massacre, torture (historical/factual)
#   savage, heathen, infidel, heretic (historical/common)
#
# KEPT - clinical/anatomical (LHAW cross-ref: acceptable):
#   penis, vulva, pubic, semen, sperm, feces, enema
#
# KEPT - crude but common (LHAW cross-ref: acceptable):
#   asses, boner, boob/boobs/boobies/booby, booty, fart/farts,
#   horny, kinky, poop/poops, puke/puked, turd/turds
#
# KEPT - clinical but not cringe:
#   mucus, phlegm, fungus, diarrhea, womb, crotch, buttock/buttocks
#
# KEPT - too much collateral damage if removed as substring:
#   "ass" substring preserved in: assassin, assault, assemble, assist, etc.
#   "cock" substring preserved in: peacock, cocktail, cockpit, etc.
#   "dick" substring preserved in: dicker, dickey, etc.
#   "rape" substring preserved in: drape, grape, scrape, etc.
#   "hell" substring preserved in: shell, hello, eggshell, etc.
#   "ho" substring preserved in: hope, home, honor, etc.


def get_blocklist():
    """Return the full blocklist as a set of lowercase words."""
    return BLOCKLIST.copy()


if __name__ == "__main__":
    bl = get_blocklist()
    print(f"Total blocklist entries: {len(bl)}")
    
    # Check which are actually in the base word list
    with open('/home/claude/spellblock-dictionary/base_filtered.txt') as f:
        base_words = set(line.strip() for line in f)
    
    in_base = bl & base_words
    not_in_base = bl - base_words
    
    print(f"Found in base list: {len(in_base)}")
    print(f"Not in base list (preemptive): {len(not_in_base)}")
    
    print(f"\nWords that WILL be removed:")
    for w in sorted(in_base):
        print(f"  {w}")
    
    print(f"\nPreemptive entries (not in base, but blocked just in case):")
    for w in sorted(not_in_base):
        print(f"  {w}")
