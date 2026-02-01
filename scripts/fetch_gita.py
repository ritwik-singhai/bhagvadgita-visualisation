#!/usr/bin/env python3
"""
Fetch all Bhagavad Gita verses in Sanskrit from the Vedic Scriptures API.
Outputs: data/verses_raw.json
"""

import json
import os
import time
import requests
from tqdm import tqdm

BASE_URL = "https://vedicscriptures.github.io"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def fetch_chapters():
    """Fetch all chapter metadata."""
    response = requests.get(f"{BASE_URL}/chapters")
    response.raise_for_status()
    return response.json()


def fetch_verse(chapter: int, verse: int):
    """Fetch a specific verse."""
    response = requests.get(f"{BASE_URL}/slok/{chapter}/{verse}")
    response.raise_for_status()
    return response.json()


def main():
    print("Fetching Bhagavad Gita verses from Vedic Scriptures API...")
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Fetch chapter metadata
    print("Fetching chapter metadata...")
    chapters = fetch_chapters()
    print(f"Found {len(chapters)} chapters")
    
    # Store all verses
    all_verses = []
    
    # Fetch each verse
    for chapter in chapters:
        chapter_num = chapter["chapter_number"]
        verse_count = chapter["verses_count"]
        chapter_name = chapter.get("name", "")
        chapter_translation = chapter.get("translation", "")
        
        print(f"\nChapter {chapter_num}: {chapter_name} ({verse_count} verses)")
        
        for verse_num in tqdm(range(1, verse_count + 1), desc=f"Ch {chapter_num}"):
            try:
                verse_data = fetch_verse(chapter_num, verse_num)
                
                # Extract relevant fields
                verse = {
                    "id": f"BG{chapter_num}.{verse_num}",
                    "chapter": chapter_num,
                    "verse": verse_num,
                    "chapter_name": chapter_name,
                    "chapter_name_english": chapter_translation,
                    "sanskrit": verse_data.get("slok", ""),
                    "transliteration": verse_data.get("transliteration", ""),
                    # Get English translation (prefer Swami Sivananda's translation)
                    "translation_english": (
                        verse_data.get("siva", {}).get("et", "") or
                        verse_data.get("purohit", {}).get("et", "") or
                        verse_data.get("gambir", {}).get("et", "")
                    ),
                    # Get Hindi translation
                    "translation_hindi": (
                        verse_data.get("tej", {}).get("ht", "") or
                        verse_data.get("rams", {}).get("ht", "")
                    ),
                }
                
                all_verses.append(verse)
                
                # Small delay to be respectful to the API
                time.sleep(0.05)
                
            except Exception as e:
                print(f"Error fetching {chapter_num}:{verse_num}: {e}")
                continue
    
    # Save to JSON
    output_path = os.path.join(OUTPUT_DIR, "verses_raw.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_verses, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Saved {len(all_verses)} verses to {output_path}")
    
    # Print summary
    print("\nSummary:")
    print(f"  Total verses: {len(all_verses)}")
    print(f"  Chapters: {len(chapters)}")
    
    # Sample verse
    if all_verses:
        print("\nSample verse (BG 1.1):")
        sample = all_verses[0]
        print(f"  Sanskrit: {sample['sanskrit'][:100]}...")
        print(f"  Translation: {sample['translation_english'][:100]}...")


if __name__ == "__main__":
    main()
