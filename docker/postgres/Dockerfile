# Postgres 16 + pgvector.
#
# Built on the same `postgres:16-alpine` base the project has always used: switching to the
# official `pgvector/pgvector:pg16` image (Debian/glibc) would change the collation provider of
# an existing data volume and require a full REINDEX. Compiling the extension keeps the volume valid.
#
# `with_llvm=no`: this base image is built `--with-llvm` but ships no LLVM at runtime, so pgvector
# must skip JIT bitcode generation. Only the JIT inlining of the extension is lost, not any feature.
FROM postgres:16-alpine

ARG PGVECTOR_VERSION=v0.8.1

RUN apk add --no-cache --virtual .build-deps build-base git \
  && git clone --branch "$PGVECTOR_VERSION" --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
  && cd /tmp/pgvector \
  && make OPTFLAGS="" with_llvm=no \
  && make install with_llvm=no \
  && rm -rf /tmp/pgvector \
  && apk del .build-deps
