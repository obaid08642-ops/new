#!/bin/bash
# Owner-approved image cleanup (lead reviewer, 2026-10-26): run 21 still had 7.45 GB free (9 needed) after the safe cleanup; docker
# reported 1.85 GB of images that no container uses. This task removes ONLY images that no container (running or stopped) uses,
# and prints each one's name and size first. The running release, its containers, every volume and every backup are untouched.
# Public lines start with "cleanup:".
set +e
DK="sudo -n docker"
free_gb() { df -Pk / | awk 'NR==2{printf "%.2f", $4/1048576}'; }
echo "cleanup: images before: free $(free_gb) GB"
USED=$($DK ps -aq | xargs -r $DK inspect -f '{{.Image}}' | sort -u)
for id in $($DK images -q --no-trunc | sort -u); do
  echo "$USED" | grep -qx "$id" && continue
  name=$($DK image inspect -f '{{if .RepoTags}}{{index .RepoTags 0}}{{else}}<none>{{end}} {{.Size}}' "$id" 2>/dev/null | awk '{printf "%s %.2f GB", $1, $2/1073741824}')
  $DK rmi "$id" >/dev/null 2>&1 && echo "cleanup: removed unused image $name" || echo "cleanup: kept $name (in use by a tag or child)"
done
$DK system df 2>&1 | sed 's/^/cleanup: docker /'
sudo -n du -xh --max-depth=1 /opt/nabdah /var/lib/docker 2>/dev/null | sort -rh | head -12 | sed 's/^/cleanup: du /'
echo "cleanup: images after: free $(free_gb) GB"
