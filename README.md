# Jarvis

Jarvis is a personal LAN dashboard for links, categories, and notes. It has a login-protected admin panel, automatic site metadata fetching, collapsible categories on the home page, and built-in backup export/import.

## Features

- Group services into categories such as planes, monitoring, media, automation, or anything else you want.
- Add, edit, delete, and reorder categories in the admin panel.
- Add services with a URL and let the app fetch the title and favicon automatically.
- Create a new category while adding a service if the category does not already exist.
- Add notes and announcements.
- Export and import full dashboard backups from the admin panel.
- Change branding, fonts, colours, layout columns, and compact mode.

## Quick Start

```bash
docker compose up -d
```

Then open `http://localhost:3000` or `http://your-server-ip:3000` in your browser.

Default credentials:

- Username: `admin`
- Password: `admin`

Change them in the admin panel after the first login.

## Admin Panel

Open the admin panel from the top-right corner of the page.

Tabs available:

- Services: add and edit links, assign categories, and fetch metadata.
- Categories: create, rename, and delete categories.
- Notes: create and manage notes.
- Layout: change grid columns and compact mode.
- Appearance: change name, subtitle, footer, fonts, and colours.
- Security: update login credentials and manage backups.

## Backups

The app stores everything in a single JSON file, so backup and restore are simple.

In the Security tab you can:

- Download a full JSON backup.
- Import a previously saved backup file.

If you want to back up the file manually from Docker, the data lives at `/data/jarvis.json` inside the container.

## Configuration

Edit `docker-compose.yml` to customise the runtime settings:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the app listens on |
| `DATA_FILE` | `/data/jarvis.json` | Path to the persisted JSON data file |
| `DEFAULT_USERNAME` | `admin` | Username used on first boot if no data file exists |
| `DEFAULT_PASSWORD` | `admin` | Password used on first boot if no data file exists |
| `SESSION_SECRET` | `change-me-in-production` | Secret used to sign login sessions |

Change `SESSION_SECRET` to a long random value before exposing the app to other users.

Example:

```bash
openssl rand -hex 32
```

## Docker Deployment

The included `docker-compose.yml` pulls the image from GitHub Container Registry using a version tag such as `1.0.3`.

That means:

- The image does not float on `latest` by default.
- You can pin a specific release in Compose.
- The GitHub Actions workflow still publishes both the version tag and `latest`.

To update to a new release, change the version in `docker-compose.yml` and restart the container.

## Updating

If you are running from source or building locally:

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

Your data file is not removed during an update.

## Running on a Different Port

Change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"
```

Then the app will be available on port `8080` on the host.

## Data and Security Notes

- Links, notes, categories, credentials, settings, and appearance are all stored in the JSON data file.
- Credentials are stored in plaintext in the data file, so this is intended for a private LAN use case.
- Sessions expire after 8 hours.
- If you expose the app publicly, place it behind HTTPS and a reverse proxy such as Caddy or Nginx.

## Versioning

The displayed UI version, `package.json`, Docker image tag, and Compose file should stay aligned. When you bump the app version, update all of them together so you always know what is running.
