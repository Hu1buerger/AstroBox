FROM ubuntu as builder
LABEL Name=astrobox Version=0.0.1 Maintainer="Vincent Modrow"

ENV ASTROBOX_VERSION=0.16.2
# Define commonly used JAVA_HOME variable
ENV JAVA_HOME /usr/lib/jvm/java-8-oracle

RUN set -xe \
	&& echo "Set Temporary packages for compilation" \
	&& export PKGS='build-essential wget apt-utils autogen autoconf libtool' \
	&& echo "Install all required packages (Temporary + Permanent)" \
	&& apt-get update \
	&& apt-get upgrade -y \
	&& apt-get install -y ${PKGS} --no-install-recommends \
	&& apt-get install -y git ruby-full rubygems python-apt python-pip python-dev git ffmpeg avrdude curl --no-install-recommends 
RUN echo "Download and install AstroBox" \
	&& cd /tmp/ \
	&& wget https://github.com/AstroPrint/AstroBox/archive/${ASTROBOX_VERSION}.tar.gz \
	&& tar -zxf ${ASTROBOX_VERSION}.tar.gz \
	&& mv -f AstroBox-${ASTROBOX_VERSION} /astrobox/ \
	&& cd /astrobox/ 

COPY ./requirements.txt /tmp/

RUN echo "Install Astrobox requirements" \
	&& pip install -U setuptools \
	&& gem install sass \
	&& pip install -r /tmp/requirements.txt \
	&& echo "Cleaning Temporary Packages + Installation leftovers" \
	&& apt-get purge -y --auto-remove ${PKGS} 

# Define working directory.
WORKDIR /astrobox/

#RUN apt-get install -y --no-install-recommends python-opencv
RUN apt-get install -y --no-install-recommends python-gobject
RUN apt-get install -y --no-install-recommends python-dbus
RUN apt-get install -y --no-install-recommends dbus
RUN mkdir -p /var/run/dbus

VOLUME ["/etc/astrobox"]
COPY ./etc/astrobox /etc/

EXPOSE 5000
#ENTRYPOINT python /astrobox/run --config /etc/astrobox/config.yaml --host 127.0.0.1