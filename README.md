# Hoofprints

*Find, share and rate horse riding routes. Available in English and German (language follows the browser; switch with the EN/DE button).*


Reitrouten finden, teilen und bewerten, auf Englisch und Deutsch. Auf echten OpenStreetMap-Karten, mit einer zuschaltbaren Ebene für markierte Reitwege. Routen kommen als GPX, KML oder GeoJSON aus Komoot, Strava, Garmin, Equilab oder Outdooractive. Es braucht kein Benutzerkonto.

## Was drin ist

- **Karte:** OpenStreetMap oder OpenTopoMap (mit Höhenlinien), dazu die Ebene „Markierte Reitwege“ von Waymarked Trails, außerdem eine Ortssuche.
- **Startseite:** Regionssuche („In meiner Nähe“ per Standort), beliebte Schnellfilter, Top-Routen, kurze Anleitung.
- **Menü:** Startseite, Routen entdecken, Gemerkt, Meine Routen, Route hinzufügen, Sprache, Über.
- **Ritt aufzeichnen:** live per GPS im Browser. Die Seite muss dabei offen und das Display an bleiben; für Aufzeichnung mit gesperrtem Handy braucht es später eine App.
- **Entdecken:** Karte und Liste mit Suche; alle Filter in einem eigenen Fenster: Schwierigkeit, Länge, Hängerparkplatz, Galoppstrecke, Wasserstelle, Einkehr und Strand.
- **Routendetails:** Länge, Dauer, Höhenprofil, Wegbeschaffenheit, Fotos, Bewertungen und GPX-Download.
- **Bearbeiten:** eigene Routen und Bewertungen lassen sich auf demselben Gerät ändern oder löschen.
- **Beitragen ohne Konto:** Routen importieren oder zeichnen, Fotos hochladen, bewerten.
- **Schutz:** Jeder Beitrag trägt eine zufällige Geräte-Kennung, die öffentlich nicht lesbar ist. Damit lassen sich eigene Beiträge auf demselben Gerät löschen und später einem Konto zuordnen.
- **Moderation:** Es gibt eine Melden-Funktion. Nach 3 Meldungen wird ein Beitrag automatisch ausgeblendet. Pro Gerät sind höchstens 10 Beiträge in 10 Minuten erlaubt.
- **Merkliste:** Gemerkte Routen bleiben auf dem jeweiligen Gerät.

## Zwei Betriebsarten

| `config.js` | Modus | Beiträge |
|---|---|---|
| leer (Standard) | **Lokal** | bleiben im Browser der jeweiligen Person |
| Supabase-Werte eingetragen | **Gemeinsam** | für alle sichtbar |

Die Seite funktioniert also sofort und wird gemeinsam, sobald die Datenbank angeschlossen ist.

## Einrichten

### 1. Website veröffentlichen

**Vercel:** Add New → Project → `hoofprint` importieren → Framework Preset „Other“, kein Build Command → Deploy. Jeder Push geht automatisch online.

**Oder GitHub Pages (kostenlos):**

1. Lade die Dateien ins Repo `hoofprint` hoch.
2. Öffne im Repo **Settings → Pages**.
3. Wähle bei **Source** „Deploy from a branch“, als Branch `main` und den Ordner `/ (root)`, dann **Save**.
4. Nach ungefähr einer Minute läuft die Seite unter `https://<dein-github-name>.github.io/hoofprint/`.

### 2. Gemeinsame Datenbank (Supabase, kostenlos)

1. Lege auf [supabase.com](https://supabase.com) ein neues Projekt an. Die Region **Frankfurt (eu-central-1)** ist wegen der DSGVO sinnvoll.
2. Öffne **SQL Editor → New query**, füge den Inhalt von `supabase/schema.sql` ein und klicke auf **Run**.
3. Unter **Project Settings → API** findest du die **Project URL** und den **anon public key**. Trag beide in `config.js` ein:

   ```js
   window.HUFSPUR_CONFIG = {
     supabaseUrl: "https://xxxx.supabase.co",
     supabaseAnonKey: "eyJ..."
   };
   ```

   Der anon key darf öffentlich sein. Die Regeln in `schema.sql` schützen die Daten.
4. Speichern, committen, fertig. Oben in der Seite steht dann **Gemeinsam** statt **Lokal**.

Die Beispielrouten blendest du mit `showExamples: false` in `config.js` aus.

### Updates der Datenbank

Wenn schon eine Datenbank läuft, führe neue Dateien `supabase/update-*.sql` einmal im SQL Editor aus (aktuell: `update-2026-10-02-edit.sql` für „Beiträge bearbeiten“). `schema.sql` enthält immer alles für eine neue Einrichtung.

### Gemeldete Beiträge prüfen

Im Supabase-Dashboard unter **Table Editor**:

- **`reports`** zeigt alle Meldungen.
- Wenn ein ausgeblendeter Beitrag in Ordnung ist, setzt du in `routes`, `reviews` oder `photos` die Spalte `hidden` wieder auf `false`.
- Löschen geht dort direkt.

## Später: optionale Konten

`schema.sql` enthält schon die Spalte `user_id` und die Funktion `claim_device`. Mit einem Login per E-Mail-Link (Supabase Auth) ruft eine angemeldete Person `claim_device(<Geräte-Kennung>)` auf. Damit gehören ihr alle Beiträge, die sie vorher anonym gepostet hat.

## Rechtliches vor dem Start

- **Impressum und Datenschutzerklärung** sind in Deutschland Pflicht. In die Datenschutzerklärung gehören Supabase, die OSM-Kacheln und die Ortssuche über Nominatim.
- **Kartendienste:** OpenStreetMap-, OpenTopoMap- und Waymarked-Trails-Kacheln sind für kleine Seiten in Ordnung. Wird die Seite groß, braucht es einen eigenen oder bezahlten Kachel-Anbieter, zum Beispiel MapTiler oder Stadia.
- **Fotos und Beschreibungen** stammen von Nutzern. Nimm Meldungen ernst und reagiere zügig.

## Dateien

- `index.html`: Seite und Gestaltung
- `app.js`: die gesamte Logik (Karte, Liste, Details, Import, Zeichnen, Datenzugriff)
- `config.js`: Supabase-Zugang
- `i18n.js`: alle Texte auf Deutsch und Englisch (neue Sprache = neuer Block mit denselben Schlüsseln)
- `supabase/schema.sql`: Tabellen, Zugriffsregeln, Spam-Bremse, Moderation, Foto-Speicher
