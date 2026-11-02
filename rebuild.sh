#!/bin/bash
cd /tmp/t
su postgres -c "dropdb --if-exists fz; createdb fz"
run(){ su postgres -c "psql -v ON_ERROR_STOP=1 -q -d fz -f $1" 2>&1 | grep -v NOTICE | tail -8; }
run mock.sql
for f in "$@"; do echo "== $f"; run $f; done
