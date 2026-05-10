from anki.collection import Collection

col = Collection(r"C:\Users\jerem\Keio\Cours\Wanikani\anki\VOC N3.apkg\collection.anki21b")

note_ids = col.find_notes("")

for nid in note_ids[:3]:
    note = col.get_note(nid)

    print("\n--- NOTE ---")

    for field_name, value in note.items():
        print(field_name, ":", value)