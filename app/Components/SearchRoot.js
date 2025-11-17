import {View, TouchableOpacity, TextInput, Text} from 'react-native';

export default function SearchRoot(){
    return(
        <View style={{backgroundColor:'white', height:'30%', width:'104.5%', position:'absolute', bottom:'-1%', left:'0.5%', borderRadius: 12,shadowColor: '#000',shadowOffset: { width: 0, height: 4 },shadowOpacity: 0.1,shadowRadius: 5,elevation: 8, padding:'5%'}}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <Text>Destino</Text>
                <TextInput placeholder='hoa'></TextInput>
            </View>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <Text>Origen</Text>
                <TextInput placeholder='hoa'></TextInput>
            </View>
            <TouchableOpacity>
                <View style={{backgroundColor:'white', alignItems:'center', borderRadius:15, padding:10, elevation:5, margin:'4%'}}>
                <Text>
                    Trazar ruta
                </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}