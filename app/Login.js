import {View, TouchableOpacity, TextInput, Text} from 'react-native';
import { useState } from 'react';
import {useRouter} from 'expo-router';

export default function LogIn(){
    const [Nickname, SetNickname] = useState('');
    const [Email, SetEmail] = useState('');
    const [Password, SetPassword] = useState('');

    const router = useRouter();

    return(
        <View style={{flex:1,justifyContent:'center', alignItems:'center'}}>
            <View style={{width:'95%', height:'90%', padding:'5%', alignItems:'center', justifyContent:'center'}}>
                <TextInput style={{width:200, height:15, padding:5,marginBottom:5}} placeholder='Nombre de usuario' onChangeText={SetNickname}></TextInput>
                <TextInput style={{width:200, height:15, padding:5,marginBottom:5}} placeholder='Nombre de usuario' onChangeText={SetNickname}></TextInput>
                <TextInput style={{width:200, height:15, padding:5,marginBottom:5}} placeholder='Nombre de usuario' onChangeText={SetNickname}></TextInput>
                <TouchableOpacity>
                    <Text>Log In</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text>Register</Text>
                </TouchableOpacity>
           </View>
        </View>
    )
}