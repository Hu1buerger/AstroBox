#!/bin/sh
set -e
#set -x

#Installer for Astrobox

DownloadURL="https://github.com/Hu1buerger/AstroBox/archive/master.zip"
TempPreRequisites="build-essential wget apt-utils autogen autoconf libtool unzip"
PermanentPreRequisites="git ruby-full rubygems python-apt python-pip python-dev git ffmpeg avrdude curl"

install_prereq() {
    echo "Installing Prerequisites... "
    apt-get install $TempPreRequisites  --no-install-recommends -y
    apt-get install $PermanentPreRequisites  --no-install-recommends -y
    echo "done"
}

install_frameworks() {
    echo "Install Frameworks..."
    pip install -U setuptools
    pip install -r /tmp/AstroBox-master/requirements.txt
    gem install sass 
    echo "done"
}

downloadAndInstallAstroBox() {
    echo "Download AstroBox from $(DownloadURL) ..."
    cd /tmp/
    wget $DownloadURL
    unzip master.zip
    cd AstroBox-master
    mv -f ./etc/astrobox /etc/astrobox
    mv -f ./src/ /astrobox/
    echo "done"
}

do_cleanup() {
    echo "cleaneup..."
    apt-get purge -y --auto-remove $TempPreRequisites
}

do_APT(){
    apt-get update 
    apt-get upgrade -y
}

do_install() {
    do_APT
    install_prereq
    downloadAndInstallAstroBox
    install_frameworks
    do_cleanup
    exit 0
}
do_install