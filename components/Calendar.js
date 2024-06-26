import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from "react-native";
import { Calendar } from 'react-native-calendars';
import { FontAwesome } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite'; // Import SQLite

const db = SQLite.openDatabase('bills.db'); // Open or create SQLite database

const CalendarScreen = () => {
    const [selectedDate, setSelectedDate] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [billsToPay, setBillsToPay] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [newBillTitle, setNewBillTitle] = useState('');
    const [newBillAmount, setNewBillAmount] = useState('');

    useEffect(() => {
        const defaultDate = new Date().toISOString().split('T')[0];
        setSelectedDate(defaultDate);
        setCurrentDate(defaultDate);
        createTable(); // Ensure that the table is created when the component mounts
        fetchBills(defaultDate);
    }, []);
    
    const createTable = () => {
        db.transaction(tx => {
            tx.executeSql(
                'CREATE TABLE IF NOT EXISTS bills (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, amount REAL, date TEXT)'
            );
        });
    };

    const fetchBills = (date) => {
        db.transaction(tx => {
            tx.executeSql(
                'SELECT * FROM bills WHERE date = ?',
                [date],
                (_, { rows }) => {
                    setBillsToPay(rows._array);
                },
                (_, error) => {
                    console.error("Error fetching bills:", error);
                }
            );
        });
    };

    const addBill = async () => {
        if (newBillTitle && newBillAmount && selectedDate) {
            try {
                db.transaction(tx => {
                    tx.executeSql(
                        'INSERT INTO bills (title, amount, date) VALUES (?, ?, ?)',
                        [newBillTitle, parseFloat(newBillAmount), selectedDate],
                        () => {
                            fetchBills(selectedDate);
                            setModalVisible(false);
                            setNewBillTitle('');
                            setNewBillAmount('');
                        },
                        (_, error) => {
                            console.error("Error adding bill:", error);
                        }
                    );
                });
            } catch (error) {
                console.error("Error adding bill:", error);
            }
        }
    };

    const editBill = async () => {
        if (selectedBill && newBillTitle && newBillAmount) {
            try {
                db.transaction(tx => {
                    tx.executeSql(
                        'UPDATE bills SET title = ?, amount = ?, date = ? WHERE id = ?',
                        [newBillTitle, parseFloat(newBillAmount), selectedDate, selectedBill.id],
                        () => {
                            fetchBills(selectedDate);
                            setModalVisible(false);
                            setNewBillTitle('');
                            setNewBillAmount('');
                        },
                        (_, error) => {
                            console.error("Error editing bill:", error);
                        }
                    );
                });
            } catch (error) {
                console.error("Error editing bill:", error);
            }
        }
    };

    const removeBill = async (id) => {
        try {
            db.transaction(tx => {
                tx.executeSql(
                    'DELETE FROM bills WHERE id = ?',
                    [id],
                    () => {
                        fetchBills(selectedDate);
                        setModalVisible(false);
                    },
                    (_, error) => {
                        console.error("Error deleting bill:", error);
                    }
                );
            });
        } catch (error) {
            console.error("Error deleting bill:", error);
        }
    };

    const isOverdue = (date) => {
        return new Date(date) < new Date(currentDate);
    };

    const isSoonDue = (date) => {
        const dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() - 3);
        return new Date(dueDate) >= new Date(currentDate);
    };

    const openModal = (bill) => {
        setSelectedBill(bill);
        setNewBillTitle(bill ? bill.title : '');
        setNewBillAmount(bill ? String(bill.amount) : '');
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.calendarContainer}>
                <Calendar
                    onDayPress={(day) => {
                        setSelectedDate(day.dateString);
                        fetchBills(day.dateString);
                    }}
                    markedDates={{
                        [selectedDate]: { selected: true, selectedColor: 'tomato' },
                        [currentDate]: { selected: true, dotColor: 'black', marked: true },
                    }}
                    theme={{
                        todayTextColor: 'green',
                        selectedDayBackgroundColor: 'rgba(0, 0, 0, 0.2)',
                    }}
                />
            </View>
            <View style={styles.billsContainer}>
                {billsToPay.map((bill) => (
                    <TouchableOpacity
                        key={bill.id}
                        style={[
                            styles.billItem,
                            isOverdue(bill.date) && { backgroundColor: 'red' },
                            isSoonDue(bill.date) && { backgroundColor: 'green' },
                            !isOverdue(bill.date) && !isSoonDue(bill.date) && { backgroundColor: 'yellow' },
                        ]}
                        onPress={() => openModal(bill)}
                    >
                        <Text style={styles.billText}>{bill.title}: ${bill.amount}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => openModal(null)}>
                <FontAwesome name="plus" size={24} color="white" />
            </TouchableOpacity>
            <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>{selectedBill ? 'Edit Bill' : 'Add Bill'}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Title"
                        value={newBillTitle}
                        onChangeText={setNewBillTitle}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Amount"
                        keyboardType="numeric"
                        value={newBillAmount}
                        onChangeText={setNewBillAmount}
                    />
                    <TouchableOpacity style={styles.button} onPress={selectedBill ? editBill : addBill}>
                        <Text style={styles.buttonText}>{selectedBill ? 'Edit Bill' : 'Add Bill'}</Text>
                    </TouchableOpacity>
                    {selectedBill &&
                        <TouchableOpacity style={styles.button} onPress={() => removeBill(selectedBill.id)}>
                            <Text style={styles.buttonText}>Delete Bill</Text>
                        </TouchableOpacity>
                    }
                    <TouchableOpacity style={styles.button} onPress={() => setModalVisible(false)}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    calendarContainer: {
        padding: 20,
    },
    billsContainer: {
        padding: 20,
    },
    billItem: {
        marginBottom: 10,
        padding: 10,
        borderRadius: 5,
    },
    billText: {
        fontSize: 16,
    },
    addButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'tomato',
        borderRadius: 50,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: 'gray',
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
        width: '100%',
    },
    button: {
        backgroundColor: 'tomato',
        padding: 10,
        borderRadius: 5,
        marginBottom: 10,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
});

export default CalendarScreen;
