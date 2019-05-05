import React, { Component } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import ImagePicker from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import socket from 'socket.io-client';

import api from '../../services/api';

import { distanceInWords } from 'date-fns';
import en from 'date-fns/locale/en';

import Icon from 'react-native-vector-icons/MaterialIcons';

import styles from './styles';

export default class Box extends Component {
  state = { box: {} };

  async componentDidMount() {
    const box = await AsyncStorage.getItem('@MsjBox:box');

    this.subscribeToNewFiles(box);

    const response = await api.get(`/boxes/${box}`);

    this.setState({ box: response.data });
  }

  subscribeToNewFiles = box => {
    const io = socket('https://msj-box-backend.herokuapp.com');

    io.emit('connectRoom', box);

    io.on('file', data => {
      this.setState({
        box: { ...this.state.box, files: [data, ...this.state.box.files] }
      });
    });
  };

  openFile = async file => {
    try {
      const filePath = `${RNFS.DocumentDirectoryPath}/${file.title}`;
      await RNFS.downloadFile({
        fromUrl: file.url,
        toFile: filePath
      });

      await FileViewer.open(filePath);
    } catch (err) {
      console.log('Arquivo não suportado');
    }
  };

  renderItem = ({ item }) => {
    const [prefix, ext] = item.title.split('.');
    const itemName = `${prefix.substring(0, 15)}.${ext}`;
    return (
      <TouchableOpacity onPress={() => this.openFile(item)} style={styles.file}>
        <View style={styles.fileInfo}>
          <Icon name="insert-drive-file" size={24} color="#A5CFFF" />
          <Text style={styles.fileTitle}>{itemName}</Text>
        </View>

        <Text style={styles.fileData}>
          {distanceInWords(item.createdAt, new Date(), {
            locale: en
          })}{' '}
          ago
        </Text>
      </TouchableOpacity>
    );
  };

  handleUpload = () => {
    ImagePicker.launchImageLibrary({}, async upload => {
      if (upload.error) {
        console.log('ImagePicker error');
      } else if (upload.didCancel) {
        console.log('Canceled by user');
      } else {
        const data = new FormData();

        const [prefix, suffix] = upload.fileName.split('.');

        // Image for iOS
        const ext = suffix.toLowerCase() === 'heic' ? 'jpg' : suffix;

        data.append('file', {
          uri: upload.uri,
          type: upload.type,
          name: `${prefix}.${ext}`
        });

        api.post(`/boxes/${this.state.box._id}/files`, data);
      }
    });
  };

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.boxTitle}>{this.state.box.title}</Text>

        <FlatList
          style={styles.list}
          data={this.state.box.files}
          keyExtractor={file => file._id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={this.renderItem}
        />

        <TouchableOpacity style={styles.fab} onPress={this.handleUpload}>
          <Icon name="cloud-upload" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }
}
