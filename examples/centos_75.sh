#
#  This file provide basic guide for building TDLib binary on CentOS 7.5.
#
#  Procedure can be done easily inside a Docker container:
#  docker run -it -v /tmp:/tmp centos:7.5.1804 bash
#

yum -y update
yum -y install git perl make which gperf readline-devel zlib-devel

curl -JOL https://cmake.org/files/v3.11/cmake-3.11.4-Linux-x86_64.sh
chmod +x cmake-3.11.4-Linux-x86_64.sh
./cmake-3.11.4-Linux-x86_64.sh --skip-license --prefix=/usr
rm -f cmake-3.11.4-Linux-x86_64.sh

yum -y install centos-release-scl devtoolset-7-gcc-c++
scl enable devtoolset-7 bash

curl -JOL https://www.openssl.org/source/openssl-1.1.0h.tar.gz
tar -xzf openssl-1.1.0h.tar.gz
rm -f openssl-1.1.0h.tar.gz
cd openssl-1.1.0h
./config --prefix=/usr/local/openssl
./config -t
make install
ln -s /usr/local/openssl/lib/libcrypto.so.1.1 /usr/lib64/libcrypto.so.1.1
ln -s /usr/local/openssl/lib/libssl.so.1.1 /usr/lib64/libssl.so.1.1
ldd /usr/local/openssl/bin/openssl
PATH=$PATH:/usr/local/openssl/bin
which openssl && openssl version

curl -JOL https://zlib.net/zlib-1.2.11.tar.gz
tar -xzf zlib-1.2.11.tar.gz
rm -f zlib-1.2.11.tar.gz
cd zlib-1.2.11
./configure --prefix=/usr/local/zlib
make && make install

git clone https://github.com/tdlib/td.git
cd td
mkdir build
cd build
cmake -DCMAKE_BUILD_TYPE=Release -DOPENSSL_ROOT_DIR=/usr/local/openssl ..
cmake --build .
cp libtdjson.so /tmp

#
#  Now you have the binary built, copy it to your tglib server from /tmp folder
#  Install OpenSSL same as above for your CentOS 7.5 server where tglib run on.
#

curl -JOL https://www.openssl.org/source/openssl-1.1.0h.tar.gz
tar -xzf openssl-1.1.0h.tar.gz
rm -f openssl-1.1.0h.tar.gz
cd openssl-1.1.0h
./config --prefix=/usr/local/openssl
./config -t
make install
ln -s /usr/local/openssl/lib/libcrypto.so.1.1 /usr/lib64/libcrypto.so.1.1
ln -s /usr/local/openssl/lib/libssl.so.1.1 /usr/lib64/libssl.so.1.1
ldd /usr/local/openssl/bin/openssl
PATH=$PATH:/usr/local/openssl/bin
which openssl && openssl version
