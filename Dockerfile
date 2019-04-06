FROM ubuntu as builder
LABEL Name=astrobox Version=0.0.1 Maintainer="Vincent Modrow"

#ENV ASTROBOX_VERSION=0.16.2

COPY ./install.sh /tmp/install.sh

RUN sh /tmp/install.sh

# Define working directory.
WORKDIR /astrobox/

RUN apt-get install -y --no-install-recommends python-opencv
RUN apt-get install -y --no-install-recommends python-gobject
#RUN apt-get install -y --no-install-recommends python-dbus

#VOLUME ["/etc/astrobox"]

EXPOSE 5000
#ENTRYPOINT python /astrobox/run --config /etc/astrobox/config.yaml --host 127.0.0.1