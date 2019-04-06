FROM ubuntu as builder
LABEL Name=astrobox Version=0.0.1 Maintainer="Vincent Modrow"

ENV ASTROBOX_VERSION=0.16.2
# Define commonly used JAVA_HOME variable
ENV JAVA_HOME /usr/lib/jvm/java-8-oracle

COPY ./install.sh /tmp/install.sh

#Split for reusing of layers
RUN sh /tmp/install.sh do_APT
RUN sh /tmp/install.sh install_prereq
RUN sh /tmp/install.sh downloadAndInstallAstroBox
RUN sh /tmp/install.sh install_frameworks
RUN sh /tmp/install.sh do_cleanup


# Define working directory.
WORKDIR /astrobox/

RUN apt-get install -y --no-install-recommends python-opencv
RUN apt-get install -y --no-install-recommends python-gobject
#RUN apt-get install -y --no-install-recommends python-dbus

#VOLUME ["/etc/astrobox"]

EXPOSE 5000
#ENTRYPOINT python /astrobox/run --config /etc/astrobox/config.yaml --host 127.0.0.1