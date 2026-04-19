# jarvis

this is coded using claude so your mileage may vary but it works for me and I'm just documating it here so I don't lose it lol 


<img width="2559" height="1031" alt="image" src="https://github.com/user-attachments/assets/99d2fb28-7603-486e-bd20-e503ea8c853c" />



Personal LAN dashboard. Manage service links and notes from a clean dark UI with a login-protected admin panel.

## quick start

```bash
docker compose up -d
```

Then open `http://localhost:3000` (or `http://your-server-ip:3000`) in your browser.

Default credentials: `admin` / `admin` — change them in the admin panel after first login.

---

## configuration

Edit `docker-compose.yml` to customise:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the app listens on |
| `DEFAULT_USERNAME` | `admin` | Username on first boot (only used if no data file exists yet) |
| `DEFAULT_PASSWORD` | `admin` | Password on first boot |
| `SESSION_SECRET` | `change-me-...` | Secret for session signing — **change this** |

**Change `SESSION_SECRET`** to any long random string before deploying. You can generate one with:

```bash
openssl rand -hex 32
```

---

## data persistence

All data (links, notes, credentials) is stored in a Docker named volume (`jarvis_data`) at `/data/jarvis.json` inside the container. It survives container restarts and updates.

To back it up:

```bash
docker run --rm -v jarvis_jarvis_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/jarvis-backup.tar.gz /data
```

---

## updating

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

Your data volume is untouched.

---

## running on a different port

Change the `ports` line in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"   # access on port 8080
```

---

## security notes

- Credentials are stored in plaintext in `jarvis.json`. This is fine for a private LAN but don't expose this to the public internet without adding HTTPS (e.g. via a Caddy or Nginx reverse proxy).
- Sessions expire after 8 hours.
- Change `SESSION_SECRET` before deploying.
