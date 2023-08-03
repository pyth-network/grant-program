#!/bin/bash
set -o errexit -o nounset -o pipefail
command -v shellcheck >/dev/null && shellcheck "$0"

# initialize variables
dev=0
test=0
verbose=0

DIR=$(cd "$(dirname "$0")" && pwd)
TOKEN_DISPENSER_DIR="$DIR/../../token-dispenser";


usage() {
  cat <<EOF
  Usage: $0 -d[--dev]|-t[--test] -v[--verbose] -h[--help]
  where:
    -d | --dev  : start up test validator, deploy programs, run postgres docker and migrate
    -t | --test : run tests
    -h | --help : print this usage message

  -d and -t are mutually exclusive
EOF
}

# parse flags
for i in "$@"
do
case $i in
    -d|--dev)
    if [ "$test" -eq 1 ]; then
      usage
      exit
    else
      dev=1
    fi
    shift
    ;;
    -t|--test)
    if [ "$dev" -eq 1 ]; then
      usage
      exit
    else
      test=1
    fi
    shift
    ;;
    -v|--verbose)
    verbose=1
    shift
    ;;
    -h|--help)
    usage
    exit 0
    ;;
    *)
    # unknown option
    ;;
esac
done

if [ "$dev" -eq 0 ] && [ "$test" -eq 0 ]; then
  printf "No mode selected. Please select either -d[--dev] or -t[--test]\n\n"
  usage
  exit 1
fi



function start_postgres_docker() {
    # TODO: use different ports for dev and test
    docker run  -d -e POSTGRES_PASSWORD="password" \
      -p 5432:5432 -e POSTGRES_USER=postgresUser \
      --name token-grant-postgres \
      postgres
}

function stop_postgres_docker() {
      docker stop token-grant-postgres || true
      docker rm token-grant-postgres || true
}

function setup_postgres_docker() {
  if [ "$verbose" -eq 1 ]; then
    echo "starting up postgres docker"
  fi
  start_postgres_docker;
  sleep 10
  if [ "$verbose" -eq 1 ]; then
    echo "running postgres docker migrations"
  fi
  npm run migrate;
}

function run_frontend_tests() {
  npm run test;
}


function start_test_validator() {
  cd "$TOKEN_DISPENSER_DIR";
  anchor localnet &
}

function stop_test_validator() {
  solana_pid=$(pgrep -f '[s]olana-test-validator' || true)
  if [ -n "$solana_pid" ]; then
    echo "killing solana-test-validator with pid: $solana_pid"
    kill "$solana_pid"
  else
    echo "No solana-test-validator process found to stop"
  fi
}


function cleanup() {
  if [ "$verbose" -eq 1 ]; then
    echo "cleaning up postgres docker"
  fi
  stop_postgres_docker;
  if [ "$verbose" -eq 1 ]; then
      echo "shutting down solana-test-validator if running"
  fi
  stop_test_validator;
}

function main() {
  # run clean up in case of failures from previous run
  cleanup;
  # setup postgres docker
  setup_postgres_docker;
  if [ "$dev" -eq 1 ]; then
      if [ "$verbose" -eq 1 ]; then
        echo "dev mode"
        echo "deploy solana-test-validator using anchor localnet"
      fi
      printf "\n\n**Running solana-test-validator until CTRL+C detected**\n\n"
      start_test_validator;
      # wait for ctrl-c
      ( trap exit SIGINT ; read -r -d '' _ </dev/tty )
  elif [ "$test" -eq 1 ]; then
    if [ "$verbose" -eq 1 ]; then
        echo "test mode"
        echo "running frontend tests"
      fi
      run_frontend_tests;
  else
      echo "no mode selected"
      usage;
  fi
  cleanup;
}

main
