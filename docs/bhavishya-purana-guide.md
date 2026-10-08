# Bhavishya Purana — reading guide and video series plan

Source: *Sankshipt Bhavishya Puran* (Gita Press, Gorakhpur; abridged Hindi edition, 654 PDF pages, 485 chapters) —
the PDF the user uploaded to the GitHub release tagged `Purana`. The Hindi text layer is Internet Archive OCR: readable,
with occasional glitches (two-column pages need column-aware extraction; see "Working with the PDF").

## How the book is organised

| Parva | Chapters | PDF pages (approx.) | What it contains |
|---|---|---|---|
| **Brahma-parva** | 1–127 | 14–260 | Frame story (Sumantu tells King Shatanika). Creation and time, samskaras, a woman's/man's conduct, then the long cycle of *tithi-kalpas* (pratipada → purnima) with vrata rules. From ch. 30 it becomes the great **Surya (Sun) section**: Surya's family, worship, temples, the **Samba story**, the Magas/Bhojakas, Surya's names and hymns. |
| **Madhyama-parva** | 128–157 | 260–290 | Householder dharma, cosmology (7 upper / 7 lower worlds, geography), temple/garden/tank consecration, fire rites, omens. Mostly ritual manuals. |
| **Pratisarga-parva** | 158–212 | 290–390 | The narrative core. Khanda 1: dynasties (Satya/Treta/Dvapara, then Kali-yuga kings) and **Vikramaditya**. Khanda 2: the **Vetala tales** (23 chapters, ending the Vikramaditya cycle) and the **Satyanarayana katha** (ch. 173–178), Panini/Vararuchi, Bopadeva, **Durga Saptashati** stories. Khanda 3–4: Alha-Udal, Shalivahan, King Bhoj, later dynasties, medieval saints (Ramananda, Kabir, Chaitanya, Tulsidas…), **Kali-yuga and Kalki** (ch. 211–212), the return of Satya-yuga. |
| **Uttara-parva** | 213–485 | 390–654 | Yudhishthira and Krishna: a huge catalogue of **vratas** (tithi by tithi), each with its legend (Savitri, Janmashtami, Hara-kali, Anant-chaturdashi, Dashavatara-vrata, Bhishma-panchaka …), plus *dana* (gift) rules, snana, and the Mahabharata-style teaching framework. |

Roughly 85% of the book is ritual instruction. The stories worth turning into film sit in a handful of places.

## Stories I have read in full (source of the scripts)

### Samba and Surya — Brahma-parva ch. 72–74, 127–129 (PDF ~119–123, 165–170)
- Samba, Krishna and Jambavati's son, mocks the thin, yellow-eyed sage **Durvasa** (mimicking his walk) and is cursed: *"जा, तू शीघ्र ही कुष्ठरोगसे ग्रस्त हो जायगा."* A second mockery later produces the iron *musala* that destroys the Yadavas.
- Krishna tells him to worship Surya; **Narada** teaches him Surya's greatness.
- Samba does harsh tapas at **Mitravana**, on the **Chandrabhaga** river (identified in the text with Multan). Surya appears, gives him the **21 names** (Vikartana, Vivasvan, Martanda, Bhaskara, Ravi … *stavaraja*), and the leprosy falls away "like a snake's slough".
- A glowing wooden image of Surya (made by Vishvakarma from kalpavriksha wood, the glare ground down on the lathe at Shakadvipa) floats down the river; Samba installs it and founds **Sambapura**.
- Moral given in the text: never insult gods, gurus or Brahmins; speak sweetly and stay humble.
- Produced as: **Part 1** (`projects/purana-samba`).

### Satyanarayana katha — Pratisarga-parva khanda 2, ch. 173–178 (PDF ~319–335)
- Narada sees suffering in the mortal world and asks Vishnu for a way out. Vishnu teaches the **Satyanarayana vrata**, powerful especially in Kali-yuga.
- Chapter 1: poor Brahmin **Shatananda** of Kashi meets Vishnu disguised as an old Brahmin, is shown the vrata, and prospers.
- Chapter 2: exiled king **Chandrachuda** learns it from Shatananda in Kashi, receives a sword in a dream, regains his kingdom.
- Later chapters: the woodcutters (ch. 176), the merchant (sadhu vanik) and his son-in-law (ch. 177), and the summary (ch. 178).
- Planned as **Part 2**.

### Vikramaditya and the Vetala — Pratisarga-parva khanda 1–2 (ch. 163 onward; PDF ~305–319)
- The Vetala-Vikram cycle ends with the Vetala, pleased by Vikramaditya's answers, promising to live in his arms and telling him to rebuild the ruined sacred cities, perform the Ashvamedha, and rule justly; Vikramaditya becomes a *chakravarti*.
- Planned as **Part 3** (needs a full read of ch. 163–172).

## Planned series (each ~75–95 s, Telugu narration in the user's mother's cloned voice)

1. **Samba and Surya** — done (rendered).
2. **Satyanarayana katha** — Narada, Shatananda, Chandrachuda, the woodcutters, the merchant.
3. **Vikramaditya and the Vetala** — the frame story and 2–3 of the riddles.
4. **Surya's family** — Sanjna, Chhaya, Yama and Shani, the sun-chariot and the twelve Adityas (ch. 30–51).
5. **Naga Panchami and the origin of the serpents** (ch. 22–26).
6. **Kali-yuga and Kalki** — decline of dharma, Kalki's avatar, the return of Satya-yuga (ch. 211–212).
7. **Vrata legends from the Uttara-parva** — Savitri, Krishna Janmashtami, Hara-kali, Dashavatara.

Open questions for the user: which of these first; whether to keep Telugu; whether to provide dedicated 3D models
(Samba, Durvasa, Narada, Surya, Krishna, Vishnu, Vikramaditya, Vetala) — Part 1 uses the rigged Bali model as Samba/Surya
and the Shukracharya model as Durvasa.

## Working with the PDF

- `pdftotext` default/`-layout` interleaves the two columns. Use `pdftotext -bbox` and split words at the widest empty x-gap
  near the page middle, then sort by line (the scripts in this session did exactly that).
- Printed page numbers differ from PDF pages by ~2 at the start and ~11 after the plate section.
- Chapter ends are marked `(अध्याय N)`; cross-references use the same notation, so do not index by that marker alone.

## Addendum: Satyanarayana katha, fully read (for Part 2)
Sequence in ch. 173–178: Narada sees suffering and goes to Vishnu, who teaches the vrata (truth is the one dharma that endures in Kali-yuga).
1. **Shatananda**, a poor Kashi Brahmin, meets Vishnu disguised as an old Brahmin, is shown the vrata, finds unexpected wealth, performs it with neighbours.
2. King **Chandrachuda** of Manipuraka, defeated by the mlechchhas, wanders to Kashi, learns it from Shatananda, receives a sword in a dream, destroys six thousand raiders and recovers his kingdom.
3. The **woodcutters (nishadas)** see Shatananda's prosperity; they perform the vrata and earn four times their usual income.
4. **Sadhu the merchant** (of Ratnapura) vows a puja if he gets a child, forgets after daughter **Kalavati** is born and married to **Shankhapati**; trading on the Narmada he and his son-in-law are jailed as thieves; Lilavati and Kalavati perform the vrata; the king dreams of releasing them; Vishnu, as an ascetic, turns the cargo into leaves; the merchant repents; Kalavati leaves the prasad to rush to her husband, the boat sinks, a voice says she must eat the prasad, the boat reappears.
Moral: keep your word; Vishnu is pleased by devotion, not by expense.
